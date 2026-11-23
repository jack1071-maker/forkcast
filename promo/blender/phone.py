# The Forkcast promo's 3D phone, built and animated in Blender (Cycles), rendered with a transparent background.
#   blender -b -P blender/phone.py -- <shot: snap|end> <width percent> <samples> [frame numbers...]
# Writes PNG frames to public/3d/<shot>/0000.png ... (finished frames are skipped) and public/3d/<shot>.json with
# where the key parts land in the 1080 x 1920 frame, so the 2D shots can line up with the 3D ones exactly.
# A modern phone (titanium frame, black glass, Dynamic Island, triple camera). No logo, no side buttons.
import bpy, bmesh, sys, os, json, math
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
argv = sys.argv[sys.argv.index('--') + 1:]
SHOT, PCT, SAMPLES = argv[0], int(argv[1]), int(argv[2])
FAST = 'fast' in argv  # no motion blur, fewer bounces: about 3x quicker
ONLY = [int(x) for x in argv[3:] if x != 'fast']
FPS = 30

# ---------- Smooth curves that never overshoot (from the skill's tracks.py) ----------
def mono(keys):
    T = [k[0] for k in keys]; V = [k[1] for k in keys]
    d = [(V[i + 1] - V[i]) / (T[i + 1] - T[i]) for i in range(len(T) - 1)]
    m = [d[0]] + [0 if d[i - 1] * d[i] <= 0 else 2 * d[i - 1] * d[i] / (d[i - 1] + d[i]) for i in range(1, len(d))] + [d[-1]]
    def f(t):
        if t <= T[0]: return V[0]
        if t >= T[-1]: return V[-1]
        i = 0
        while t > T[i + 1]: i += 1
        h = T[i + 1] - T[i]; u = (t - T[i]) / h
        return (2*u**3 - 3*u**2 + 1) * V[i] + (u**3 - 2*u**2 + u) * h * m[i] + (-2*u**3 + 3*u**2) * V[i + 1] + (u**3 - u**2) * h * m[i + 1]
    return f

# ---------- Phone size (meters, like a 6.1-inch phone) ----------
W, H, D = 0.0706, 0.1466, 0.00825
R = 0.0105          # corner radius
BEZ = 0.0017        # black border around the display
LENS_GLASS = 0.0048 # radius of each camera lens's black glass
BX, BY = W / 2 - 0.0035 - 0.018, H / 2 - 0.0035 - 0.018   # camera bump center (front-view coordinates)
MAIN = (BX + 0.0088, BY + 0.0088)                       # main lens
ISLAND = (0.0205, 0.0062)
ISLAND_Y = H / 2 - BEZ - 0.0050

# ---------- Scene ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.cycles.use_adaptive_sampling = True
sc.cycles.adaptive_threshold = 0.03
sc.cycles.max_bounces = 3 if FAST else 6
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
sc.render.resolution_percentage = PCT
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.render.fps = FPS
sc.render.use_motion_blur = not FAST
sc.render.use_persistent_data = True  # keep the scene in memory between frames instead of rebuilding it
if FAST: sc.cycles.adaptive_threshold = 0.06
sc.render.motion_blur_shutter = 0.4
# Standard view so the screen's colors come out exactly as designed.
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'

world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.85, 0.83, 0.80, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.18

def mat(name, base, rough=0.3, metal=0.0, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*base, 1); p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal; p.inputs['Coat Weight'].default_value = coat; p.inputs['Coat Roughness'].default_value = 0.03
    return m

TITANIUM = mat('titanium', (0.55, 0.53, 0.50), 0.3, metal=1.0)
BLACK_GLASS = mat('black_glass', (0.004, 0.004, 0.005), 0.05, coat=1.0)
BACK_GLASS = mat('back_glass', (0.40, 0.39, 0.37), 0.45, coat=0.3)
LENS = mat('lens', (0.002, 0.002, 0.003), 0.04, coat=1.0)
LENS_CORE = mat('lens_core', (0.008, 0.006, 0.016), 0.03, coat=1.0)
ISLAND_MAT = mat('island', (0.003, 0.003, 0.003), 0.55)  # matte, to match the solid black 2D pill
FLASH = mat('flash', (0.92, 0.88, 0.72), 0.25, coat=0.5)

def screen_mat(name, image):
    m = mat(name, (0, 0, 0), 0.6, coat=0.0)  # matte, so the light doesn't glare across the app
    nt = m.node_tree; p = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(os.path.join(HERE, image)); tex.interpolation = 'Cubic'
    nt.links.new(tex.outputs['Color'], p.inputs['Emission Color']); p.inputs['Emission Strength'].default_value = 1.0
    return m

# ---------- Geometry helpers ----------
def rr(w, h, r, n=20):
    """Rounded rectangle outline, counter-clockwise."""
    pts = []
    for cx, cy, a0 in ((w/2 - r, h/2 - r, 0), (-w/2 + r, h/2 - r, 90), (-w/2 + r, -h/2 + r, 180), (w/2 - r, -h/2 + r, 270)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n); pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def slab(name, pts, z0, z1, material, parent, bevel=0.0, uv_size=None, cx=0.0, cy=0.0):
    """Extrude a 2D outline from z0 to z1, optionally rounding the top and bottom rims."""
    bm = bmesh.new()
    bot = [bm.verts.new((x + cx, y + cy, z0)) for x, y in pts]
    top = [bm.verts.new((x + cx, y + cy, z1)) for x, y in pts]
    bm.faces.new(list(reversed(bot))); ftop = bm.faces.new(top)
    for i in range(len(pts)):
        j = (i + 1) % len(pts); bm.faces.new((bot[i], bot[j], top[j], top[i]))
    if uv_size:
        uv = bm.loops.layers.uv.new()
        for f in bm.faces:
            for l in f.loops:
                x, y, _ = l.vert.co; l[uv].uv = ((x - cx) / uv_size[0] + 0.5, (y - cy) / uv_size[1] + 0.5)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); o.parent = parent; me.materials.append(material)
    for poly in me.polygons: poly.use_smooth = True
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 5; b.limit_method = 'ANGLE'; b.angle_limit = math.radians(50)
        b.harden_normals = False
    return o

def disc(name, r, z0, z1, x, y, material, parent, bevel=0.0):
    pts = [(r * math.cos(2 * math.pi * i / 64), r * math.sin(2 * math.pi * i / 64)) for i in range(64)]
    return slab(name, pts, z0, z1, material, parent, bevel, cx=x, cy=y)

phone = bpy.data.objects.new('phone', None); sc.collection.objects.link(phone); phone.rotation_mode = 'XYZ'

slab('frame', rr(W, H, R), -D / 2, D / 2, TITANIUM, phone, bevel=0.0011)
slab('front_glass', rr(W - 0.0008, H - 0.0008, R - 0.0004), D / 2 - 0.0004, D / 2 + 0.00025, BLACK_GLASS, phone, bevel=0.0004)
dw, dh = W - 2 * BEZ, H - 2 * BEZ
screen_img = 'screen-snap.png' if SHOT == 'snap' else 'screen-today.png'
slab('display', rr(dw, dh, R - BEZ), D / 2 + 0.00026, D / 2 + 0.00027, screen_mat('display', screen_img), phone, uv_size=(dw, dh))
slab('island', rr(ISLAND[0], ISLAND[1], ISLAND[1] / 2), D / 2 + 0.00027, D / 2 + 0.00031, ISLAND_MAT, phone, cy=ISLAND_Y)
slab('back_glass', rr(W - 0.0008, H - 0.0008, R - 0.0004), -D / 2 - 0.00025, -D / 2 + 0.0004, BACK_GLASS, phone, bevel=0.0004)
zb = -D / 2 - 0.0013
slab('bump', rr(0.036, 0.036, 0.0085), zb, -D / 2, BACK_GLASS, phone, bevel=0.0006, cx=BX, cy=BY)
for i, (x, y) in enumerate([MAIN, (BX + 0.0088, BY - 0.0088), (BX - 0.0088, BY)]):
    disc(f'lens_ring{i}', 0.0062, zb - 0.0016, zb, x, y, TITANIUM, phone, bevel=0.0004)
    disc(f'lens{i}', LENS_GLASS, zb - 0.00175, zb - 0.0016, x, y, LENS, phone)
    disc(f'lens_core{i}', 0.0021, zb - 0.0018, zb - 0.00175, x, y, LENS_CORE, phone)
disc('flash', 0.0026, zb - 0.0003, zb, BX - 0.0088, BY + 0.0105, FLASH, phone)
disc('sensor', 0.0021, zb - 0.0003, zb, BX - 0.0088, BY - 0.0105, LENS, phone)

# ---------- One big soft light (most of what makes it look filmed) ----------
ld = bpy.data.lights.new('key', 'AREA'); ld.shape = 'RECTANGLE'; ld.size, ld.size_y = 0.35, 0.5; ld.energy = 16
key = bpy.data.objects.new('key', ld); sc.collection.objects.link(key); key.location = (-0.62, 0.42, 0.28)
key.rotation_mode = 'QUATERNION'; key.rotation_quaternion = (Vector((0, 0, 0)) - key.location).to_track_quat('-Z', 'Y')

cd = bpy.data.cameras.new('cam'); cd.lens = 85; cd.sensor_width = 36; cd.sensor_fit = 'HORIZONTAL'; cd.clip_start = 0.002
cam = bpy.data.objects.new('cam', cd); sc.collection.objects.link(cam); sc.camera = cam; cam.rotation_euler = (0, 0, 0)

# ---------- The two moves ----------
PX_PER_M = lambda dist: 85 / 36 * 1080 / dist   # pixels per meter at a distance, for this lens
if SHOT == 'snap':
    # Starts on the main lens (its black glass matches the 2D camera button, 328 px wide), pulls back while the
    # phone spins to face us, and lands dead center showing the camera screen.
    START_D = 2 * LENS_GLASS * 85 / 36 * 1080 / 328
    END_D = H * 85 / 36 * 1080 / 1300                    # phone 1300 px tall
    LAND = 2.6
    lens_world = (-MAIN[0], MAIN[1], -(zb - 0.00175))   # main lens with the phone turned around (180 degrees)
    dist = mono([(0, START_D), (0.7, START_D * 1.9), (LAND, END_D), (LAND + 0.3, END_D)])
    rot = mono([(0, math.pi), (0.3, math.pi), (LAND, 0), (LAND + 0.3, 0)])
    tx = mono([(0, lens_world[0]), (0.3, lens_world[0]), (LAND, 0), (LAND + 0.3, 0)])
    ty = mono([(0, lens_world[1]), (0.3, lens_world[1]), (LAND, 0), (LAND + 0.3, 0)])
    tz = mono([(0, lens_world[2]), (0.3, lens_world[2]), (LAND, D / 2), (LAND + 0.3, D / 2)])
else:
    # Starts on the Dynamic Island (matching the 2D pill, 520 px wide), pulls back while the phone makes one full
    # turn, and settles face-on a little above center for the end card.
    START_D = ISLAND[0] * 85 / 36 * 1080 / 520
    END_D = H * 85 / 36 * 1080 / 1000                    # phone 1000 px tall
    LAND = 4.6
    lift = 200 / PX_PER_M(END_D)                          # phone sits 200 px above the frame's center
    dist = mono([(0, START_D), (0.5, START_D * 1.25), (3.6, END_D * 0.92), (LAND, END_D), (LAND + 0.4, END_D)])
    rot = mono([(0, 0), (0.45, 0), (LAND, 2 * math.pi), (LAND + 0.4, 2 * math.pi)])
    tx = mono([(0, 0), (LAND + 0.4, 0)])
    ty = mono([(0, ISLAND_Y), (0.45, ISLAND_Y), (LAND, -lift), (LAND + 0.4, -lift)])
    tz = mono([(0, D / 2), (LAND + 0.4, D / 2)])
N = int(round((LAND + 0.1) * FPS)) + 1

def pose(t):
    phone.rotation_euler = (0, rot(t), 0)
    cam.location = (tx(t), ty(t), tz(t) + dist(t))

for f in range(N):
    sc.frame_set(f); pose(f / FPS)  # set the frame first, then the pose, so earlier keys don't overwrite it
    phone.keyframe_insert('rotation_euler', frame=f); cam.keyframe_insert('location', frame=f)
sc.frame_start, sc.frame_end = 0, N - 1

# ---------- Where things land in the frame (for lining up the 2D shots) ----------
def px(co):
    v = world_to_camera_view(sc, cam, Vector(co)); return [round(v.x * 1080, 1), round((1 - v.y) * 1920, 1)]
info = {'frames': N, 'land_frame': int(LAND * FPS)}
sc.frame_set(0); bpy.context.view_layer.update()
if SHOT == 'snap':
    c = Vector(lens_world)
    info['lens_start'] = {'center': px(c), 'left': px(c + Vector((-LENS_GLASS, 0, 0))), 'right': px(c + Vector((LENS_GLASS, 0, 0)))}
    sc.frame_set(N - 1); bpy.context.view_layer.update()
    z = D / 2 + 0.00027
    info['display_end'] = {'top_left': px((-dw / 2, dh / 2, z)), 'bottom_right': px((dw / 2, -dh / 2, z))}
else:
    z = D / 2 + 0.00031
    info['island_start'] = {'top_left': px((-ISLAND[0] / 2, ISLAND_Y + ISLAND[1] / 2, z)), 'bottom_right': px((ISLAND[0] / 2, ISLAND_Y - ISLAND[1] / 2, z))}
    sc.frame_set(N - 1); bpy.context.view_layer.update()
    info['phone_end'] = {'top_left': px((-W / 2, H / 2, D / 2)), 'bottom_right': px((W / 2, -H / 2, D / 2))}
out = os.path.join(ROOT, 'public', '3d', SHOT); os.makedirs(out, exist_ok=True)
with open(os.path.join(ROOT, 'public', '3d', f'{SHOT}.json'), 'w') as fh: json.dump(info, fh, indent=2)
print('INFO', json.dumps(info), flush=True)

# Save a normal Blender file too, so the scene can be opened and looked around in Blender (not needed for rendering).
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, f'forkcast-phone-{SHOT}.blend'), check_existing=False)

# ---------- Render ----------
for f in (ONLY or range(N)):
    path = os.path.join(out, f'{f:04d}.png')
    if os.path.exists(path) and os.path.getsize(path) > 0 and not ONLY: continue
    sc.frame_set(f); sc.render.filepath = path; bpy.ops.render.render(write_still=True); print('FRAME', f, flush=True)

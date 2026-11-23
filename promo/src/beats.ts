// The video's beats, shared by the animation (Promo.tsx) and the sound (sound.mjs), so the sound always lands on the picture.
// Plain JavaScript inside a .ts file so Node can read it directly.

export const FPS = 30;

/** Every beat, in seconds. Change a number here to retime the video. */
export const B = {
  dot: 0.1,
  ringDraw: [0.35, 1.7],
  fork: [0.9, 1.8],
  word1: 1.1,
  toButton: [2.6, 3.2], // ring fills in black and becomes the camera button
  cameraIcon: [2.95, 3.4],
  word2: 3.3,
  squash: [4.3, 4.5], // the button is "pressed"
  iconOut: [4.45, 4.7], // the camera icon fades, leaving a plain black disc: the phone's lens
  snap3d: 4.75, // 3D: pull back from the lens, the phone spins to face us (blender/phone.py "snap")
  iris: [4.75, 5.2], // the 3D picture opens out of the button's circle
  scan: [7.6, 8.9],
  lift: [9.0, 9.9], // the photo lifts out of the screen and becomes the estimate card
  cardText: 9.6,
  count: [9.9, 11.2],
  bars: [10.4, 11.7],
  word4: 9.8,
  press: [12.1, 12.3],
  flood: [12.3, 13.1], // card grows to fill the frame
  ring: [12.75, 14.7],
  word5: 13.4,
  toWeek: [15.7, 16.6], // big ring shrinks into today's mini ring, the week slides out of it
  weekFill: [17.1, 18.5],
  streak: 18.1,
  word6: 16.7,
  toDots: [19.3, 20.1], // rings shrink into the points of a line
  line: [20.0, 21.1],
  goalLine: [20.4, 21.1],
  dateChip: 21.4,
  word7: 20.2,
  toPill: [22.3, 23.0], // the seven points slide together into the phone's Dynamic Island
  end3d: 23.0, // 3D: pull back from the island, the phone turns once and settles (blender/phone.py "end")
  endIris: [23.0, 23.45],
  endText: 26.5,
  end: 29.5,
};

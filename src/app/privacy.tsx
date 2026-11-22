import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, F, R } from '@/lib/ui';

const UPDATED = 'November 22, 2026';
const CONTACT_URL = 'https://github.com/jack1071-maker/forkcast/issues';

// Plain-language privacy policy. Keep it in sync with what the app actually does.
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'The short version',
    body: [
      'Forkcast only collects what it needs to work: your email (if you make an account), the food, goals and weights you log, and the food photos you choose to analyze. It has no ads, no analytics and no tracking, and your data is never sold.',
    ],
  },
  {
    title: 'If you use it without an account',
    body: [
      'Everything stays on your device (your browser’s storage, or the app’s storage on your phone). Nothing is sent to our servers. Clearing your browser data or deleting the app erases it.',
    ],
  },
  {
    title: 'If you create an account',
    body: [
      'We store:',
      '• Your email address and a securely hashed version of your password (we can never see your actual password).',
      '• Your Forkcast data: the details you entered in setup (age, sex, height, weight, activity, goal), your calorie and macro targets, the meals you logged and your weigh-ins.',
      'This is used only to back up your log and sync it between your devices.',
    ],
  },
  {
    title: 'Food photos',
    body: [
      'When you snap or choose a photo for an estimate, a smaller copy is sent to our server and then to Anthropic (anthropic.com), whose Claude AI estimates the calories and macros. Forkcast does not save your photos; only the numbers you choose to add are kept.',
      'Anthropic handles the photo under its own commercial terms and privacy policy. Only take photos of food, not of people or anything private.',
      'If the AI reads a barcode in your photo, only that barcode number is looked up in Open Food Facts (openfoodfacts.org), a free public food database, to get the product’s label nutrition. Nothing about you is sent with it.',
      'We also count how many photos each account analyzes per day, to keep the free service within its limits.',
    ],
  },
  {
    title: 'Where it’s stored',
    body: [
      'Account data is stored with Supabase (supabase.com), a database provider, on servers in Canada. The app itself is hosted by Expo (expo.dev). These services are only used to run the app.',
      'Database security rules make sure each account can only ever read or change its own data.',
    ],
  },
  {
    title: 'Health information',
    body: [
      'Calorie targets and estimates are general guides, not medical advice. As the app’s developer I technically have access to the database to keep it running, but I don’t look at people’s logs.',
    ],
  },
  {
    title: 'Deleting your data',
    body: [
      'You can delete your account at any time: Progress → Delete my account. This permanently deletes your account and everything saved in it from our servers straight away.',
    ],
  },
  {
    title: 'Children',
    body: ['Forkcast isn’t directed at children under 13, and we don’t knowingly collect their data.'],
  },
  {
    title: 'Changes and contact',
    body: [
      'If this policy changes, the date at the top will change too. Questions or requests: open an issue on the project’s GitHub page.',
    ],
  },
];

export default function PrivacyPolicy() {
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Pressable onPress={goBack} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.h1}>PRIVACY POLICY</Text>
        <Text style={styles.updated}>Last updated {UPDATED}</Text>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.card}>
            <Text style={styles.h2}>{s.title}</Text>
            {s.body.map((p, i) => (
              <Text key={i} style={styles.p}>
                {p}
              </Text>
            ))}
          </View>
        ))}

        <Pressable onPress={() => Linking.openURL(CONTACT_URL)}>
          <Text style={styles.link}>Contact: github.com/jack1071-maker/forkcast</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: C.bg },
  wrap: { padding: 20, gap: 12, paddingBottom: 40 },
  back: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { color: C.accent, fontSize: 16, fontFamily: F.semi },
  h1: { fontSize: 38, lineHeight: 46, fontFamily: F.head, color: C.text },
  updated: { color: C.muted, fontFamily: F.body, fontSize: 13, marginTop: -6 },
  card: { backgroundColor: C.card, borderRadius: R.md, padding: 16, gap: 8 },
  h2: { fontSize: 17, fontFamily: F.bold, color: C.text },
  p: { fontFamily: F.body, fontSize: 14, color: C.muted, lineHeight: 21 },
  link: { color: C.accent, textAlign: 'center', fontFamily: F.body, fontSize: 14, paddingVertical: 8 },
});

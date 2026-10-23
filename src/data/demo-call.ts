// Demo 1: the call Joy answered from Rebecca. The audio (public/demo/rebecca-call.mp3) was voiced with ElevenLabs:
// Joy is "Kathryn Lake", Rebecca is "Jessica - Authentic NYC Conversational". start and end are seconds into the file,
// measured when the takes were stitched, so the transcript can follow the audio line by line.
export type CallLine = { who: 'joy' | 'rebecca'; start: number; end: number; text: string };
export const CALL_AUDIO = '/demo/rebecca-call.mp3';
export const CALL_LINES: CallLine[] = [
  { who: 'joy', start: 0.5, end: 7.64, text: "Thank you for calling Marlow & Finch Salon & Spa! I'm Joy, your AI guest concierge. How may I make your day a little more beautiful?" },
  { who: 'rebecca', start: 8.19, end: 14.33, text: "Hi Joy! I'm interested in getting my hair lighter. I wanted to ask about pricing and availability." },
  { who: 'joy', start: 14.88, end: 19.4, text: "Absolutely! I'd love to help you find the perfect experience. Have you visited us before?" },
  { who: 'rebecca', start: 19.95, end: 22.21, text: "No, this would be my first time!" },
  { who: 'joy', start: 22.76, end: 29.99, text: "Well, welcome to Marlow & Finch, Rebecca! Tell me, are you envisioning something soft and natural, or a brighter blonde transformation?" },
  { who: 'rebecca', start: 30.54, end: 32.82, text: "Something natural and low-maintenance." },
  { who: 'joy', start: 33.37, end: 48.59, text: "Beautiful choice! Our Blonding Transformations are customized to your hair goals and lifestyle. We have several artist levels, with services beginning at $179 for Level 3 and $350 for Level 5. Is there a price range you're most comfortable with?" },
  { who: 'rebecca', start: 49.14, end: 51.83, text: "I'd prefer to stay around $200." },
  { who: 'joy', start: 52.38, end: 58.85, text: "Of course! Let me check availability with one of our Level 3 artists. Olivia has an opening Friday at 2:30. Would that work?" },
  { who: 'rebecca', start: 59.4, end: 60.26, text: "Perfect!" },
  { who: 'joy', start: 60.81, end: 68.34, text: "Wonderful! Many of our blonding guests also enjoy adding a nourishing treatment for extra shine and softness. Would you like me to include that option?" },
  { who: 'rebecca', start: 68.89, end: 72.06, text: "Actually, yes! My hair has been feeling dry." },
  { who: 'joy', start: 72.61, end: 83.14, text: "Absolutely! I'll include that in your appointment request. I'll text you a secure link to complete your guest profile and card on file. Your appointment will be held for 24 hours while you complete that step." },
  { who: 'rebecca', start: 83.69, end: 84.66, text: "Sounds great!" },
  { who: 'joy', start: 85.21, end: 92.27, text: "And since it's your first visit, I'll include our address and parking information. We can't wait to welcome you to Marlow & Finch, Rebecca!" },
  { who: 'rebecca', start: 92.82, end: 93.84, text: "Thank you, Joy!" },
  { who: 'joy', start: 94.39, end: 96.08, text: "It's my pleasure. Have a beautiful day!" },
];

// The call as the owner reads it. Times are salon time on the prototype's "today" (Saturday 10 Oct 2026); the salon
// opens at 9, so Joy took this one before anyone was in. Olivia is a Level 3 artist who exists only in this demo.
export const CALL = {
  caller: 'Rebecca Hale', first: 'Rebecca', phone: '(917) 555-0186', email: 'rebecca.hale@example.com',
  at: '8:47 am', ended: '8:49 am', length: '1 min 37 s', guest: 'New guest',
  stylist: { name: 'Olivia Grant', role: 'Level 3 colour artist' },
  service: 'Blonding Transformation, Level 3', addOn: 'Nourishing treatment',
  when: 'Friday, October 16', time: '2:30 pm', until: '5:15 pm',
  price: 179, addOnPrice: 45, total: 224,
  holdUntil: 'Sunday 8:49 am', link: 'marlowfinch.example/c/rh1016',
  address: '1412 Chicago Ave, Evanston, IL 60201',
  parking: 'Free two-hour parking behind the building (enter from Davis St). Metered street parking on Chicago Ave.',
};

// What Joy did, in the order it happened. from/to are indexes into CALL_LINES.
export interface CallStage { id: string; title: string; detail: string; from: number; to: number }
export const STAGES: CallStage[] = [
  { id: 'answer', title: 'Answered', detail: 'Picked up at 8:47 am, before the salon opened.', from: 0, to: 0 },
  { id: 'discover', title: 'Asked what she wants', detail: 'First visit, natural and low-maintenance.', from: 1, to: 5 },
  { id: 'recommend', title: 'Quoted from your prices', detail: 'Artist levels from $179, then asked her budget: about $200.', from: 6, to: 7 },
  { id: 'close', title: 'Matched a slot', detail: 'Level 3 fits the budget. Olivia, Friday 2:30. Yes.', from: 8, to: 9 },
  { id: 'upsell', title: 'Added an upsell', detail: 'Nourishing treatment, +$45. Yes.', from: 10, to: 11 },
  { id: 'book', title: 'Booked and held it', detail: 'Secure link for profile and card, held 24 hours.', from: 12, to: 13 },
  { id: 'thank', title: 'Thanked her', detail: 'Promised address and parking for a first visit.', from: 14, to: 16 },
];

export const CALL_SMS = `Hi Rebecca, it's Joy at Marlow & Finch. You're held for ${CALL.when} at ${CALL.time} with Olivia: ${CALL.service} + ${CALL.addOn.toLowerCase()}. Add your guest profile and card to confirm: ${CALL.link} (we'll hold it 24 hours). Reply STOP to opt out`;

export const CALL_NEXT = [
  { when: 'Sat 8:49 pm', what: 'If the card is still missing, one reminder text' },
  { when: 'Thu 10:00 am', what: 'Appointment reminder with parking' },
  { when: 'Sat 10:00 am', what: 'Thank-you after the visit, and a review request' },
];

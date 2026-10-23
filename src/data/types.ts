export type LeadStatus = 'not_answered' | 'joy_handling' | 'needs_person' | 'booked' | 'went_quiet';
export type Channel = 'sms' | 'instagram' | 'facebook' | 'phone' | 'form' | 'email' | 'walk_in';
export type Lifecycle = 'active' | 'at_risk' | 'lapsed';
export type Stage = 'New' | 'Returning' | 'Regular' | 'Loyal' | 'VIP';
export type ApptStatus = 'booked' | 'confirmed' | 'in_progress' | 'checked_out' | 'no_show' | 'cancelled';

export interface Service { id: string; name: string; price: number; minutes: number; rebookDays: number; consult?: boolean; fromPrice?: boolean; category: 'Colour' | 'Cut' | 'Extensions' | 'Bridal' | 'Treatment' }
export interface Stylist { id: string; name: string; role: string; services: string[]; chairs: number; tone: number }
export interface Source { id: string; name: string; type: 'ads' | 'organic' | 'phone' | 'form' | 'referral' | 'directory' | 'walk'; share: number }
export interface Campaign { id: string; sourceId: 'meta' | 'google'; name: string; status: 'active' | 'paused' | 'learning'; dailyBudget: number; objective: string }

export interface Lead {
  id: string; name: string; phone: string; ig?: string; email?: string;
  sourceId: string; campaignId?: string; channel: Channel;
  firstTouchAt: number; lastInboundAt: number; status: LeadStatus;
  ownerId: 'joy' | string | null; serviceId: string; likelyValue: number;
  score: number; scoreWhy: string[]; consentSms: boolean; consentMarketing: boolean;
  firstReplyMs: number | null; firstReplyBy: 'joy' | 'team' | null;
  handoffReason?: string; afterHours: boolean; preview: string; clientId?: string; apptId?: string; tags: string[]; touches: number;
}
export interface Visit { t: number; v: number; serviceId: string }
export interface Client {
  id: string; name: string; phone: string; email: string; sourceId: string; stylistId: string;
  visits: Visit[]; // newest first, completed
  firstVisitAt: number; lastVisitAt: number; avgTicket: number; lifetimeSpend: number;
  nextApptAt?: number; consentSms: boolean; consentMarketing: boolean; tags: string[]; preferredServiceId: string; leadId?: string; notes?: string; birthday?: string;
}
export interface Appointment {
  id: string; clientId?: string; leadId?: string; name: string; stylistId: string; serviceId: string;
  start: number; minutes: number; value: number; status: ApptStatus; bookedBy: 'joy' | 'team' | 'online' | 'client'; createdAt: number;
}
export interface BookingRequest {
  id: string; name: string; phone: string; serviceId: string; requested: number[]; notes: string; createdAt: number;
  via: 'form' | 'joy' | 'instagram'; status: 'pending' | 'confirmed' | 'declined'; leadId?: string; flags: string[]; stylistId?: string;
}
export interface Msg { at: number; dir: 'in' | 'out'; by: 'guest' | 'joy' | 'team' | 'system'; text: string; kind?: 'text' | 'call' | 'handoff' | 'booking' | 'form'; callSec?: number }
export interface Thread { id: string; leadId: string; channel: Channel; messages: Msg[]; unread: boolean }
export interface SpendEntry { day: number; sourceId: string; campaignId?: string; amount: number }
export interface Recurring { id: string; name: string; type: 'agency' | 'listing' | 'website' | 'other'; monthly: number; sourceId?: string }

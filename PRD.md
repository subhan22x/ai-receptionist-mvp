# PRD

# AI Receptionist SaaS

## 1. Product summary

AI Receptionist SaaS is a web application for small home service businesses. The product gives each business an AI phone receptionist that can answer incoming customer calls, collect job details, create contacts, create leads, book appointments, create jobs, send SMS alerts, and show business activity inside a client dashboard.

The first version focuses on small home service companies such as plumbers, electricians, HVAC companies, cleaners, roofers, garage door repair companies, locksmiths, pest control companies, and similar local service businesses.

The product should feel simple for a small business owner. The owner should be able to sign up, add business details, choose a plan, set services and hours, receive an AI phone number or forward calls to one, and then see calls, contacts, leads, appointments, jobs, and stats in one place.

## 2. Target customer

Primary customer:

1. Small home service business owner
2. Solo operator or small team
3. Receives customer calls during work hours, after hours, or while on jobs
4. Loses leads when calls are missed
5. Wants appointments booked without hiring a full time receptionist
6. Needs simple CRM and calendar visibility

Examples:

1. Local plumber
2. Electrician
3. HVAC technician
4. Mobile mechanic
5. Cleaning company
6. Garage door repair company
7. Pest control company
8. Roofing contractor

## 3. Customer problem

Small home service businesses miss calls because the owner or staff are busy on job sites. Missed calls often mean missed revenue. Many callers will call the next company if nobody answers.

The business owner also needs call details to be organized. A missed note, wrong address, forgotten follow up, or bad appointment time can cost money.

The product solves this by giving the business an AI receptionist that answers calls, captures the important information, creates records in the dashboard, and alerts the owner by text.

## 4. Product goals

1. Let a business create an account and manage its subscription.
2. Let a business set up its company profile, services, hours, booking rules, and notification preferences.
3. Let a business receive calls through an AI phone number or by forwarding its existing business number.
4. Let the AI answer calls, qualify the caller, and collect required information.
5. Let the AI create contacts, addresses, leads, appointments, jobs, and call summaries.
6. Let the owner receive SMS alerts when important events happen.
7. Let the business view daily and monthly stats.
8. Let the business manage its billing and cancellation through Stripe.
9. Prepare the data model for invoices and payments in a later release.

## 5. Non goals for version one

These features are not required in the first sellable version.

1. Full technician dispatch system
2. Native mobile app
3. Advanced invoice automation
4. Customer payment portal
5. Google Calendar sync
6. Jobber or Housecall Pro integration
7. Multi location enterprise support
8. Advanced analytics dashboards
9. Custom workflow builder
10. Customer reminder campaigns

## 6. Main user roles

## 6.1 Platform admin

The internal operator of the SaaS. Can view all businesses, subscriptions, usage, Twilio numbers, call failures, webhook errors, and support information.

## 6.2 Business owner

The main client user. Can manage business profile, services, hours, billing, contacts, leads, appointments, jobs, calls, and notification settings.

## 6.3 Business staff

A future role. Can view and manage CRM records, appointments, jobs, and calls based on permission level.

## 6.4 Caller

The customer who calls the business. They do not log into the web app in version one. They interact with the AI receptionist by phone.

## 7. Core user flows

## 7.1 Signup and onboarding

1. User signs up with email and password.
2. User verifies account if required.
3. User creates a business profile.
4. User enters business name, industry, address, website, business phone, personal phone, notification phone, timezone, and service area.
5. User adds services.
6. User adds business hours.
7. User sets booking rules.
8. User chooses a subscription plan.
9. User completes payment through Stripe Checkout.
10. User lands on the dashboard.

## 7.2 Phone setup

1. Business gets a Twilio powered AI phone number.
2. Business can use this number directly or forward existing business calls to it.
3. System maps the phone number to the correct business.
4. Incoming calls are routed to the AI receptionist.

## 7.3 Incoming call handling

1. Caller calls the AI number.
2. Backend identifies the business by the called number.
3. Backend loads business profile, services, hours, booking rules, AI settings, and notification rules.
4. AI greets the caller.
5. AI collects name, phone number, service address, issue, urgency, preferred date, and preferred time.
6. AI creates or updates a contact.
7. AI creates a lead.
8. AI creates a job if the call is a real service request.
9. AI creates an appointment if the caller confirms a time.
10. AI saves the call summary and transcript.
11. System sends SMS notification to the owner.
12. System records usage events.

## 7.4 Dashboard review

1. Business owner logs in.
2. Owner sees daily stats.
3. Owner reviews new calls, leads, appointments, and jobs.
4. Owner opens a call summary.
5. Owner can view contact details, service address, appointment time, and job status.

## 7.5 Billing management

1. Business owner opens billing page.
2. Owner sees current plan, subscription status, renewal date, and monthly usage.
3. Owner clicks manage billing.
4. Stripe Customer Portal opens.
5. Owner can update payment method, view invoices, upgrade, downgrade, or cancel.

## 8. Version one feature requirements

## 8.1 Account management

Required:

1. User signup
2. User login
3. User logout
4. Password reset
5. Business creation
6. Business profile editing
7. Business user relationship through business_users

## 8.2 Business profile

Required fields:

1. Business name
2. Industry
3. Business address
4. City
5. State
6. Zip code
7. Website
8. Business phone
9. Owner personal phone
10. Notification phone
11. Timezone
12. Service area

## 8.3 Services

The business can define services that the AI can offer.

Required fields:

1. Service name
2. Category
3. Description
4. Default duration
5. Emergency service flag
6. Active flag

## 8.4 Business hours

The business can define open and closed hours for each day of the week.

Required fields:

1. Day of week
2. Open time
3. Close time
4. Closed flag

## 8.5 Booking rules

Required fields:

1. Default appointment duration
2. Minimum notice time
3. Maximum days ahead
4. Same day booking allowed
5. After hours emergency allowed
6. Buffer time between appointments

## 8.6 AI receptionist settings

Required:

1. AI name
2. Voice
3. Greeting
4. Tone
5. Language
6. Base instructions
7. Emergency handling rules
8. Human transfer rules

## 8.7 CRM

Required objects:

1. Contacts
2. Contact addresses
3. Leads
4. Appointments
5. Jobs
6. Calls
7. Call events

## 8.8 Notifications

Required:

1. SMS notification when appointment is booked
2. SMS notification for emergency call
3. SMS notification when human follow up is needed
4. Store notification records in database

## 8.9 Billing

Required:

1. Stripe Checkout
2. Stripe Customer Portal
3. Stripe webhook handling
4. Subscription status stored in database
5. Plans stored in database
6. Usage events stored in database

## 8.10 Admin dashboard

Required:

1. View businesses
2. View subscriptions
3. View phone numbers
4. View recent calls
5. View failed calls
6. View failed SMS events
7. View webhook errors
8. View usage by business

## 9. Key business rules

## 9.1 Tenant isolation

Every business must only access its own data. All major records must be linked to business_id.

The backend must verify that the logged in user has access to the requested business before returning or changing data.

## 9.2 Subscription gating

If a business has no active subscription, the system should limit access based on product policy.

Possible behavior:

1. Allow login.
2. Show billing page.
3. Block phone activation.
4. Block AI call answering.
5. Preserve existing data.

## 9.3 Call routing

When a call comes in, the system must identify the business using the Twilio phone number.

If no business is found, the call should not access any client data.

## 9.4 Appointment creation

The system should only create appointments that follow business hours and booking rules unless the business allows emergency after hours booking.

## 9.5 Job creation

A job should be created when the caller has a real service request. The job can be linked to a lead, contact, address, call, and appointment.

## 9.6 Notification sending

The system should send SMS notifications based on business notification preferences.

Every sent or failed notification must be stored.

## 9.7 Usage tracking

The system should record usage events for calls, call minutes, SMS messages, appointment bookings, AI usage, and human transfers.

## 9.8 Webhook idempotency

Stripe and Twilio webhooks may be sent more than once. The system must store provider event IDs and avoid duplicate processing.

## 10. Success metrics

Product metrics:

1. Number of active businesses
2. Calls answered per business
3. Appointments booked per business
4. Leads created per business
5. Jobs created per business
6. Percentage of calls resulting in appointment or lead
7. Number of human follow up requests
8. Subscription conversion rate
9. Churn rate
10. Average call cost per business

Operational metrics:

1. Failed call rate
2. Failed SMS rate
3. Webhook failure rate
4. AI error rate
5. Average call duration
6. Average response latency

## 11. Launch criteria

Version one is launchable when:

1. A business can sign up.
2. A business can create a profile.
3. A business can add services and hours.
4. A business can subscribe through Stripe.
5. A business can receive an AI phone number.
6. A caller can call and speak to the AI receptionist.
7. The AI can create contact, lead, job, appointment, and call summary records.
8. The owner receives SMS when an appointment is booked.
9. The dashboard shows contacts, leads, jobs, appointments, calls, and stats.
10. The billing page links to Stripe Customer Portal.
11. Tenant isolation is tested.
12. Admin can view businesses, subscriptions, calls, and errors.

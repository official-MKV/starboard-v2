# Nigcomsat Accelerator Platform
## Technical Brief - Condensed

---

## System Overview

**Two Deliverables:**
1. **Landing Page** - Public website
2. **Starboard App** - Internal management platform

**Core Concept:** Programs function as workspaces. Users can belong to multiple programs and switch between them. Super-admins see all programs automatically.

---

## User Roles

| Role | Access | Key Permissions |
|------|--------|-----------------|
| Super-Admin | All programs (global) | Create programs, invite super-admins, full access |
| Admin | Program-specific | Manage program, invite users (not super-admins), create applications/events |
| Judge | Program-specific | View and score applications, judge hackathons |
| Mentor | Program-specific | Chat with matched startups, view all startup profiles, upload materials |
| Startup | Program-specific | View events/resources, chat, invite 2 team members |
| Team Member | Program-specific | View events/resources, chat (no team invitations) |

**Critical Rules:**
- One role per user per program (user can be Admin in Program A, Judge in Program B)
- Only super-admins can invite super-admins
- Only super-admins can create programs

---

## Feature 1: Programs (Workspaces)

### Creation
- **Who:** Super-admins only
- **Required fields:** Name, description, start date, end date, logo (optional)
- **Result:** New workspace created, accessible to creator

### Management
- Programs can be edited anytime
- Programs are manually archived (no automatic archiving)
- Super-admins see all programs in workspace switcher
- Other users only see programs they've been invited to/admitted to

---

## Feature 2: Application System

### Application Types

**1. Startup Application**
- **Fixed fields:** Startup name, sector, founder info
- **Custom fields:** Drag-and-drop form builder adds additional fields

**2. Mentor Application**
- **Fixed fields:** Name, profile image, bio, current position, LinkedIn, personal website, why they want to mentor
- **Custom fields:** Drag-and-drop form builder adds additional fields

**Important:** Judges are NOT an application type - they are invited directly.

### Form Builder
- Admins create forms using drag-and-drop interface
- Templates available
- Field types: text, textarea, dropdown, checkbox, radio, file upload, date, number, email, URL, phone
- Required/optional toggle per field
- Conditional logic supported

### Application Settings

**Basic:**
- Application open date
- Application close date
- Images/branding

**Evaluation Pipeline (Must Configure Before Opening):**

**Option 1: No Evaluation**
- Admin manually reviews and accepts/rejects
- Can filter by: date, gender, sector, specific answers
- Manual bulk admit

**Option 2: Evaluation Pipeline (1-4 steps)**

Each step requires:
1. **Type:** Interview or Non-interview
2. **Assessment Parameters:** Admin defines criteria (e.g., Innovation, Profitability). Each scored 1-10
3. **Duration:** Time window for this step
4. **Cut-off Logic:** By percentile (top X%) OR by score (minimum score) OR custom

### Evaluation Flow

1. Step completes
2. System applies cut-off automatically
3. **Successful candidates:**
   - Move to next step
   - Get email notification
   - If next step is interview: receive time slots to book
4. **Failed candidates:**
   - Archived (not deleted)
   - Can be restored if cut-off adjusted
   - Admin can manually promote to next step
   - Admin can directly admit to program

5. Final step complete → Admin closes evaluation → All non-accepted get rejection emails

### Interview Scheduling (Auto)
- Admin sets: time window, available days/times, duration, buffer time
- System generates slots
- Candidates who pass cut-off receive email with slots
- Candidates book their slot
- **One Zoom link per day** (not per slot) - host manages who joins when

---

## Feature 3: Evaluation Module (For Judges)

### Scoring

**Access:**
- View all applications in current step
- Filter by: step, score, sector, date
- Click application to score

**Scoring Interface:**
- View full application (all responses, uploaded files)
- Score each parameter 1-10
- Submit scores

**Visibility Rules:**
- ✓ Can see: Aggregate score, who has scored, number of judges who scored
- ✗ Cannot see: Individual judge scores (blind scoring)
- ✗ Cannot add notes

**Validity Rule:**
- At least 75% of assigned judges must score for score to count
- Example: 10 judges assigned → minimum 8 must score

### Interviews
- Judges see interview schedule
- One Zoom link per day for all interviews
- Can score during call or after
- No note-taking interface

---

## Feature 4: Admission & Onboarding

### Admission
1. Admin reviews applications table after evaluation
2. Filter and select candidates
3. **Bulk admit** selected candidates (manual trigger)
4. Automatic acceptance emails sent

### Onboarding Flow
1. Startup receives acceptance email with setup link
2. Set password
3. Complete profile:
   - Startup logo, description, website
   - Founder bio, photo, LinkedIn
   - Goals for program
4. Status → Active participant
5. Can now invite team members

### Team Members
- **Limit:** 2 additional members (3 total including founder)
- **Permissions:** View events, view resources, chat only
- **Invitation:** Founder sends invitation → team member sets password → automatically added to team chat and mentor-startup chat

---

## Feature 5: Mentor Matching

### Process
- **Manual matching** by admin
- Admin views unmatched startups and available mentors
- Admin selects startup + mentor → creates match
- **Ratio:** One mentor can be matched to multiple startups

### Post-Match Actions (Automatic)
1. Notifications sent to both mentor and startup
2. **Group chat auto-created** with mentor + all startup team members
3. Pre-populated with introduction message

### Mentor Visibility
- Mentors can view ALL startup profiles in program
- Can only interact with matched startups (chat, calls)
- Cannot message unmatched startups

### Reassignment
- Matches can be changed anytime
- Old chat archived, new chat created
- Both parties notified

---

## Feature 6: Invitation System

### Who Can Be Invited
- Judges (program-specific)
- Admins (program-specific)
- Super-admins (global)
- Custom roles (program-specific)
- **NOT mentors** (they apply through application system)

### Who Can Invite
- Admins: Can invite judges, admins, custom roles
- Super-admins: Can invite all of the above + super-admins

### Process

**For new users:**
1. Admin sends invitation (email + role + program selected)
2. Recipient receives email with signup link
3. Recipient sets password and completes profile
4. Account created with assigned role

**For existing users:**
1. Admin sends invitation
2. User receives notification
3. User accepts
4. New program appears in workspace switcher (no re-signup)

### Invitation Management
- View pending/accepted/expired invitations
- Resend invitations
- Revoke invitations
- Invitations expire after set period (e.g., 7 days)

---

## Feature 7: Events & Scheduling

### Event Types

**1. Lecture**
- Single speaker
- 1-2 hours typical
- Q&A included

**2. Workshop**
- Hands-on
- 2-4 hours typical
- Interactive

**3. Hackathon**
- Multi-day
- Requires special configuration (see below)

### Event Configuration

**All Events Require:**
- Title, description
- Date/time (single or multi-day)
- Format: Physical, Virtual, or Hybrid
- Speaker (one per event)
- Visibility: Public or Program-only

**Public Events:**
- Visible on landing page
- External people can RSVP
- Must set "external slots" (capacity for non-participants)
- Internal participants can always attend

**Program-Only Events:**
- Only program participants can attend

### Zoom Integration
- Embedded Zoom (controlled environment, no direct link)
- Platform manages access
- Attendance tracked automatically

### Attendance Tracking

**Rule:** If ANY team member joins within 15 minutes of start → Entire startup marked "attended"

**Purpose:** Attendance affects demo-day eligibility

**Admin View:**
- See which startups attended which events
- Filter by startup, event, date
- Export reports

### Hackathon-Specific

**Configuration:**
- Start date, end date
- Submission deadline
- Judging parameters (admin defines criteria, each scored 1-10)
- Assign judges

**Submission Requirements:**
- Project name
- Description
- Website URL
- Video (3 min max)
- Pitch deck
- **Project ready checkbox** (confirms submission is final)

**Submission Location:**
- Startups submit from Dashboard or Events page

**Judging:**
- Judges access from Events page under specific hackathon
- See all startup submissions
- Score based on parameters (1-10 each)
- Same rules as application evaluation (75% must score)

### Event Materials
- Admins can attach materials to events
- Available before/during/after event
- Recording available if event was recorded

### Reminders
- Automatic reminders sent 24 hours before event
- Optional 1-hour reminder

---

## Feature 8: Mentor/Startup Meetings Tracking

### Requirement
- **Minimum: 1 call per month** between mentor and startup
- Calls happen in mentor-startup group chat
- Required for demo-day eligibility

### Tracking (Automatic)
- System monitors calls in group chats
- **Valid meeting:** Mentor + at least 1 startup team member attend for 15+ minutes
- No manual logging needed
- No notes required

### Consequences
- If requirement not met → Startup CANNOT participate in demo-day
- No other penalties (still in program, can attend events)

### Admin Dashboard
- View all mentor-startup pairs
- See last meeting date and total meetings
- Filter by: met this month / not met this month
- End-of-month: Admin can filter pairs that haven't met and reach out

### Notifications
- Mid-month reminder if no meeting yet
- End-of-month reminder (last chance)
- Both mentor and startup notified

---

## Feature 9: Material Management

### Upload Permissions
- Admins, mentors, judges, custom roles with permission can upload
- Startups and team members cannot upload

### View Permissions
- Everyone in program can view materials (based on access control)

### Material Types
- Documents (PDF, Word, Excel, PowerPoint)
- Videos (uploaded or embedded)
- Presentations
- Links to external resources

### Organization
- **Categories:** Fundraising, Product Development, Marketing, Legal, etc.
- **Tags:** Multiple tags per material (#seed-stage, #b2b, #technical)
- **Description:** Required for all materials

### Access Control (2 Levels)
1. **Public:** Visible on landing page (anyone can access)
2. **Program-only:** Only program participants can access

### Upload Process
1. Click "Upload Material"
2. Select file or enter link
3. Fill: Title, description, category, tags, access level
4. Publish

---

## Feature 10: Chat & Communication

### Chat Types

**1. Startup Team Chat**
- Auto-created when startup admitted
- Participants: Founder + all team members
- Cannot be deleted

**2. Mentor-Startup Group Chat**
- Auto-created when mentor matched
- Participants: Mentor + founder + all team members
- Updates automatically when team members added/removed

**3. One-to-One Chat**
- Any user can message any other user in program
- Direct message between two people

### Permissions

**Admins, Judges, Mentors:**
- Can create channels/group chats
- Can send one-to-one messages

**Startups (Founders and Team Members):**
- Can ONLY send one-to-one messages
- Cannot create channels or groups
- Can participate in automatic chats

### Features
- File sharing
- Message search
- Replies (inline, not threaded)
- Edit messages (within time limit, e.g., 15 min)
- Delete messages (within time limit)
- @mentions
- Emoji reactions

### Call Scheduling
- Schedule directly from any chat
- Opens modal: date picker, time picker, duration, title, notes
- Sends invitation
- Automatically creates Zoom meeting
- Calendar invites sent to participants
- Reminders sent

### Call Attendance Tracking
- System tracks who joins calls
- For mentor-startup calls: Used for monthly requirement tracking
- 15-minute rule applies

---

## Feature 11: Notifications

### Channels
- In-app notifications (bell icon, notification center)
- Email notifications

### Trigger Examples
- Application status updates (received, advanced, accepted, rejected)
- Interview scheduled
- Mentor matched
- Event reminders (24h and 1h before)
- New chat messages
- Call scheduled
- Monthly meeting not yet scheduled
- Material uploaded
- Team member joined
- Role changed

### User Control
- Notification preferences page
- Can toggle in-app/email per notification type
- Can mute specific chats
- Do-not-disturb mode
- Email digest option (daily/weekly)

---

## Feature 12: Email Templates

### Management
- Centralized location for all email templates
- **All admins** can create, edit, and manage templates
- Not restricted to super-admins

### Capabilities
- Adjust existing templates
- Create custom templates (e.g., for custom roles)
- Use template variables

### Template Variables
- `{startup_name}`, `{program_name}`, `{founder_name}`, `{interview_date}`, `{event_name}`, `{mentor_name}`, `{score}`, etc.
- Variables automatically populate with data when email sent

### Standard Templates
- Application received, advanced, accepted, rejected
- Interview invitation
- Acceptance email
- Mentor assignment
- Event invitation/reminder
- Monthly meeting reminder
- Role invitation
- Password reset

---

## Feature 13: Role Management

### Pre-Defined Roles
1. Super-Admin (global)
2. Admin (program-specific)
3. Judge (program-specific)
4. Mentor (program-specific)
5. Startup/Founder (program-specific)
6. Team Member (program-specific)

### Custom Roles
- Admins can create custom roles
- Custom role names
- **Action-level permissions:** Granular control (view, create, edit, delete for each feature)
- Example: "Workshop Facilitator" with permissions to create events and upload materials only

### Permission Categories
- Program management
- Application management
- Evaluation
- User management
- Mentor management
- Events
- Materials
- Chat
- Reporting
- System settings

### Role Assignment
- Role assigned when sending invitation (recipient cannot change)
- Admins can change user roles after assignment (immediate effect)
- **One role per user per program**

### Onboarding
- Pre-defined roles: Role-specific onboarding flow
- Custom roles: Profile setup only

---

## Key Business Rules

### Demo-Day Eligibility
A startup is eligible for demo-day ONLY if:
1. Attendance threshold met (attend X% of events, e.g., 80%)
2. Monthly mentor meetings requirement met (minimum 1 call per month)

If either requirement not met → Cannot participate in demo-day

### Evaluation Scoring Validity
- At least 75% of assigned judges must score a candidate
- If below 75%, candidate flagged
- Admin must resolve before cut-off applied

### Team Size Limits
- Maximum 3 people per startup (1 founder + 2 team members)

### Program Archiving
- Programs are manually archived (no automatic archiving)
- Admin must explicitly archive when program complete

### Invitation Expiration
- Invitations expire after set period (e.g., 7 days)
- Can be resent to generate new link

---

## Critical User Flows

### Flow 1: Startup Application → Admission

1. Startup applies via landing page
2. Application submitted → confirmation email
3. [Evaluation process runs]
4. Admin bulk admits selected startups
5. Startup receives acceptance email with setup link
6. Startup sets password
7. Startup completes profile
8. Status → Active participant

### Flow 2: Judge Evaluating Applications

1. Judge logs in → sees dashboard with pending applications
2. Clicks "Score Applications"
3. Views application table
4. Filters/sorts as needed
5. Clicks application to open
6. Reviews application details (left panel)
7. Scores parameters 1-10 (right panel)
8. Submits score
9. Returns to table, repeats for next application

### Flow 3: Admin Matching Mentor to Startup

1. Admin navigates to Mentor Matching
2. Views list of unmatched startups and available mentors
3. Selects startup
4. Selects mentor
5. Confirms match
6. System creates group chat (auto)
7. Notifications sent to mentor and startup (auto)

### Flow 4: Mentor and Startup Monthly Call

1. Mentor sees "No meeting with StartupX this month" on dashboard
2. Clicks "Chat with StartupX"
3. Opens mentor-startup group chat
4. Clicks "Schedule Call"
5. Modal opens: selects date, time, duration
6. Sends invitation
7. Startup receives notification
8. Both receive calendar invite
9. On call day: Both join via chat
10. System tracks attendance (15-min rule)
11. Meeting recorded in system
12. Dashboard updates to show "Met this month ✓"

### Flow 5: Admin Creating Event

1. Admin navigates to Events
2. Clicks "Create Event"
3. Selects event type (Lecture/Workshop/Hackathon)
4. Fills required fields: title, description, date, speaker, format
5. Sets visibility (Public or Program-only)
6. If Public: Sets external slots
7. If Hackathon: Configures judging parameters, assigns judges, sets deadlines
8. Attaches materials (optional)
9. Publishes event
10. Notifications sent to eligible participants

### Flow 6: Startup Submitting Hackathon Project

1. Startup sees hackathon event in Events list
2. Clicks event → views details
3. Clicks "Submit Project"
4. Fills submission form:
   - Project name, description
   - Website URL
   - Uploads video (3 min max)
   - Uploads pitch deck
   - Checks "Project Ready"
5. Submits
6. Receives confirmation
7. Submission visible to judges

---

## Edge Cases & Special Scenarios

### Application Evaluation
- If candidate archived due to cut-off but admin adjusts cut-off → candidate can be restored
- Admin can manually promote any candidate to next step (overrides cut-off)
- Admin can directly admit any candidate (skips remaining steps)

### Mentor Matching
- If mentor reassigned → old chat archived, new chat created
- Team member added after matching → automatically added to mentor-startup chat
- Mentor can be matched to unlimited startups (admin decides capacity)

### Event Attendance
- If any team member attends (15-min rule) → whole startup marked attended
- Late arrivals (within 15 min) count as attended
- Demo-day eligibility calculated based on attendance percentage

### Mentor Meetings
- If meeting requirement not met → cannot participate in demo-day (but still in program)
- Meeting tracked automatically (no manual logging)
- Admin can see which pairs haven't met and proactively reach out

### Invitations
- If invited user already exists → no new signup, just grant access to new program
- If invitation expires → can be resent with new link
- Invitations can be revoked before acceptance

### Roles
- User can have different roles in different programs
- Role changes take effect immediately
- Custom role permissions can be modified after creation

---

## System Behavior Notes

### Auto-Created Entities
- Startup team chat (on admission)
- Mentor-startup group chat (on matching)
- Group chat participants update when team members added/removed

### Automatic Notifications
- Sent for all major actions (application status, matching, events, meetings)
- Users can customize notification preferences
- Critical notifications cannot be disabled

### Automatic Tracking
- Event attendance (via Zoom integration)
- Mentor meeting attendance (via chat calls)
- No manual logging required

### Data Visibility
- Super-admins see all programs and all data
- Admins see only their assigned program
- Judges see only applications they're evaluating
- Mentors see all startups but can only interact with matched ones
- Startups see only program content, not other startups' private data

### Permission Inheritance
- Custom roles inherit no permissions by default
- Must explicitly grant each permission
- Can be as restrictive or permissive as needed

---

**This brief covers the essential technical operations, business logic, and user flows without visual design guidance. Refer to full 112-page documentation for comprehensive details.**
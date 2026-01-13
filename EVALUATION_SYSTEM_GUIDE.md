# Evaluation System - Complete Guide

## Overview

The evaluation system allows you to score applications through a 2-step process:
1. **Step 1: Initial Review** - Evaluators score applications on multiple criteria
2. **Step 2: Interview Round** - Evaluators score interview performance

---

## Step-by-Step Workflow

### PHASE 1: Setup (Admin Only)

#### 1.1 Navigate to Application Settings
**URL**: `/applications/[applicationId]/evaluation`


#### 1.2 Configure Evaluation Steps

When you first visit the evaluation page, you'll see a setup form:

**Step 1 Configuration**:
- **Name**: e.g., "Initial Review"
- **Type**: INITIAL_REVIEW (not interview)
- **Criteria**: Define what evaluators will score
  - Example: Innovation (weight: 1.5), Team (weight: 1.0), Market Fit (weight: 1.2)
  - Weights determine importance (higher weight = more impact on total score)

**Step 2 Configuration**:
- **Name**: e.g., "Interview Round"
- **Type**: INTERVIEW
- **Criteria**: Define interview scoring
  - Example: Presentation (weight: 1.0), Q&A (weight: 1.0)

**Click "Create Evaluation Steps"** → System creates the 2-step evaluation pipeline

---

### PHASE 2: Assign Evaluators

**Current Issue**: There's no "Evaluators" role - you need to assign Judge role
**What I'm adding**: Dedicated "Evaluator" role

**How to assign**:
1. Go to `/users`
2. Invite users with role: "Evaluator" (or currently "Judge")
3. They can now access the scoring interface

---

### PHASE 3: Step 1 - Initial Review

#### 3.1 Evaluators Score Applications

**Evaluator URL**: `/judge` or `/applications/[applicationId]/evaluation/score`

**What evaluators see**:
- List of applications to score
- Click "Score Application" → Modal opens
- View full application details (left side)
- Score each criterion 1-10 (right side)
- Add optional notes
- Submit score

**Important**:
- Each evaluator can only score each application ONCE
- Evaluators cannot see other evaluators' scores (blind scoring)
- Evaluators CAN see aggregate score and how many people scored

#### 3.2 Admin Reviews Scores

**Admin URL**: `/applications/[applicationId]/evaluation`

**What admin sees**:
- **Scoreboard table** with columns:
  - Applicant name & email
  - Company name
  - **Average Score** (or "Invalid" if <75% evaluators scored)
  - **Judges Scored**: "3/5" (shows how many out of total)
  - Current Step
  - Checkbox to select

**75% Rule**:
- If you have 5 evaluators assigned, at least 4 must score (75%)
- If only 3/5 scored, score shows "Invalid" with red badge
- Invalid scores don't count in rankings

#### 3.3 Admin Advances Candidates to Step 2

1. Select candidates (checkboxes)
2. Click "Advance to Step 2"
3. System:
   - Moves them to Step 2
   - Sends email: "Congratulations! You've Advanced to Interview Round"

---

### PHASE 4: Step 2 - Interview Round

#### 4.1 Admin Creates Interview Slots

**Tab**: "Step 2: Interview Round" → "Interview Slots" section

**What admin does**:
1. Enter date, start time, end time, Zoom link
2. Click "Add Slot"
3. Repeat for all needed slots
4. Candidates who advanced can now book slots

**Zoom Links**:
- You can use ONE link per day (as per brief)
- Or unique link per slot (more common)

#### 4.2 Candidates Book Interview Slots

**Candidate URL**: They receive email with link
`/applications/[applicationId]/book-interview?submissionId=X&stepId=Y`

**What candidates see**:
- List of available time slots
- Click "Book This Slot"
- Confirmation page with:
  - Date & time
  - Zoom link
- Email sent with same details

#### 4.3 Evaluators Score Interviews

**Same as Step 1**, but now scoring Step 2 criteria:
- View application
- Score on Step 2 criteria (e.g., Presentation, Q&A)
- Submit

#### 4.4 Admin Admits Final Candidates

1. View Step 2 scoreboard
2. Select top candidates
3. Click "Admit"
4. System:
   - Sets status to ACCEPTED
   - Sends email: "Congratulations! You've Been Accepted"

---

## What I Built vs What's Missing

### ✅ BACKEND (Fully Built)

1. **Database Models**:
   - EvaluationStep (stores step config)
   - EvaluationCriteria (stores criteria with weights)
   - ApplicationScore (stores each evaluator's scores)
   - InterviewSlot (stores interview slots)

2. **API Endpoints** (9 routes):
   - POST /evaluation/steps/setup - Create steps
   - GET /evaluation/steps - Get steps
   - POST /evaluation/steps/[stepId]/score - Submit score
   - GET /evaluation/steps/[stepId]/scoreboard - View scores
   - POST /evaluation/steps/[stepId]/advance - Advance candidates
   - POST /evaluation/admit - Admit candidates
   - POST/GET /evaluation/steps/[stepId]/slots - Manage slots
   - POST /evaluation/slots/[slotId]/book - Book slot

3. **Business Logic**:
   - 75% validity rule (in evaluation-service.js)
   - Weighted score calculation
   - Aggregate score calculation
   - Blind scoring (evaluators can't see individual scores)

4. **Email Notifications**:
   - Advancement email
   - Interview booking confirmation
   - Acceptance email

### ❌ MISSING / NEEDS IMPROVEMENT

#### 1. **No Application Settings Page**
**What's missing**: A page where admin can:
- Configure min/max scores (currently hardcoded 1-10)
- Set required % of evaluators (currently hardcoded 75%)
- Edit steps after creation
- View/manage evaluators assigned

#### 2. **No Evaluator Role**
**What's missing**:
- Dedicated "Evaluator" role (currently using "Judge")
- Evaluator assignment UI
- Can't see "who is assigned to score this application"

#### 3. **Scoreboard Missing Information**
**Current columns**: Name, Email, Company, Score, Judges Scored, Step
**Should show**:
- Who specifically scored (evaluator names)
- Individual scores from each evaluator (you said you want to see this - NOT blind)
- Submitted date
- Status (pending/in progress/completed)
- Actions (view details, override score)

#### 4. **No Evaluator List/Progress View**
**What's missing**: A view showing:
- All evaluators assigned to this application
- How many applications each has scored
- Which applications are pending for each evaluator

---

## CURRENT FILE LOCATIONS

### Frontend Components
- `src/components/applications/evaluation/step-setup.jsx` - Setup form
- `src/components/applications/evaluation/admin-scoreboard.jsx` - Scoreboard table
- `src/components/applications/evaluation/judge-scoring.jsx` - Evaluator scoring interface
- `src/components/applications/evaluation/interview-slots.jsx` - Slot management

### Pages
- `src/app/(platform)/applications/[applicationId]/evaluation/page.js` - Main evaluation page
- `src/app/(platform)/applications/[applicationId]/book-interview/page.js` - Candidate booking

### Backend
- `src/lib/services/evaluation-service.js` - All business logic
- `src/app/api/applications/[applicationId]/evaluation/**/*.js` - API routes

---

## WHAT I'M FIXING NOW

1. **Create Evaluator role** in database
2. **Create Application Settings page** with:
   - Edit evaluation steps
   - Configure min/max scores
   - Set required evaluator percentage
   - Assign evaluators to application
3. **Improve Scoreboard** to show:
   - Individual evaluator scores (expandable row)
   - Who scored vs who hasn't
   - More detailed information
4. **Create Evaluator Progress page** showing:
   - Which evaluators are assigned
   - Their scoring progress
   - Send reminders to evaluators who haven't scored

---

## Testing the System

### Quick Test (30 minutes)

1. **Setup**:
   - Create an application
   - Go to `/applications/[id]/evaluation`
   - Create 2 steps with criteria

2. **Create test data**:
   - Submit 5 test applications
   - Create 3 evaluator accounts (or use judge role)

3. **Step 1**:
   - Have evaluators score applications
   - View scoreboard as admin
   - Advance 3 candidates to Step 2

4. **Step 2**:
   - Create 3 interview slots
   - Have candidates book slots
   - Evaluators score interviews
   - Admit 1 candidate

**Expected time**: 30 minutes to verify end-to-end

---

I'm now creating the missing pieces you identified.

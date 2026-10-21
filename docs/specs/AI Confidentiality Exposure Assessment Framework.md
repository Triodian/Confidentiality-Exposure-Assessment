# AI Confidentiality Exposure Assessment Framework

Oct 21, 2026 · @Damian Hickey · Draft for confirmation

## 1. Summary

The AI confidentiality exposure assessment establishes, for one live or recently closed transaction, every channel by which the company's deal information can reach an external AI model, and what the company could show about each if asked whether the information left. It is the technical half of a joint engagement led by DLC Legal. DLC Legal answers what the company can require of its people and advisers, and what it must disclose if information leaves; this assessment answers what can actually be shown.

| Item | Position |
| --- | --- |
| Question answered | For each channel by which deal information can reach an external model, what evidence can the company produce that the information did not leave, or of what left and when? |
| Unit of assessment | One channel: a sanctioned tool and its terms, a personal account or device, an enterprise assistant's reach over the deal folders, a data-room export path, or one adviser's tooling |
| Instruments | The channel register, the five questions and the non-egress evidence ladder |
| Duration | Two weeks |
| Inputs | Through counsel: the deal team and insider list, the adviser list and their letters, the confidentiality deed, the tenant owner's configuration summary, and the sanctioned tools' terms |
| Not required | Deal content, system access, deal data, provider involvement |
| Outputs | The channel register, one finding per channel, a 90-day plan from what exists, the residual gap marked, and a technical annex in Triodian's name |
| Independent check | Validation by a separate hand within Triodian; an external checker if DLC Legal confirms one |
| Measure | The company's own duties and the terms it has signed, as DLC Legal determines them. The assessment is solution-agnostic and presents no product |
| Fee | Fixed, proposed at A$12,500 to A$15,000, engaged by DLC Legal under privilege |

**Status of this document.** The problem statement, the four outputs, the engagement shape, the roles and the fee come from the DLC Legal planning deck (21 October 2026). The channel taxonomy, the five questions, the register fields, the ladder, the test, the finding types, the two-week plan and the templates are drafted here to make the method executable, following the structure of the AI Use Assessment Framework (11 October 2026) so that one app build can serve both. Section 13 lists each drafted element that needs confirmation.

**Standing rule.** Every legal determination is the company's and its counsel's. Triodian supplies the framework, the facts and the technical classification. Nothing in the assessment or its working papers states a legal conclusion, including whether any information was price-sensitive, whether any carve-out was lost, or whether any deed was breached.

**Second standing rule.** No deal content enters the assessment. The register describes channels, terms, settings and records. It never holds a deal document, a paragraph from one, a price, a counterparty name or a valuation figure. The deal is referred to by a code name chosen by counsel.

## 2. Scope and boundaries

### 2.1 Why the deal window

The deal window is the one period when a company's confidential information carries its highest value and its hardest consequences at the same time. The deck names four: continuous disclosure, where confidentiality is the condition for the carve-out; insider trading, where deal information in the wrong hands is price-sensitive information; the confidentiality deed and its breach consequences; and the price, where a leak moves it, invites a rival bid or ends the process. Which of these applies, and how, is DLC Legal's determination. The assessment records the information classes each channel can carry so that counsel can make it.

### 2.2 The channel and its boundaries

The assessment follows deal information outward from the company and tests three kinds of boundary. Each register entry and each finding is tagged with one of them.

| Code | Boundary | Who controls the near side | What the company can do |
| --- | --- | --- | --- |
| B1 | The company's own estate | The company's tenant owner and IT | Configure, direct, log |
| B2 | An adviser's estate | The bank, law firm, technical adviser or data-room provider | Require by letter or deed; obtain attestation or record |
| B3 | Personal estate | A member of the deal team or insider list, on a personal account or device | Direct only; evidence is the direction and its acknowledgement |

### 2.3 The channel taxonomy

Every channel on the register is one of seven kinds. The taxonomy is fixed so that registers from different deals and different clients can be compared.

| Code | Channel kind | Boundary | Example |
| --- | --- | --- | --- |
| K1 | Sanctioned enterprise assistant with reach over stored content | B1 | Microsoft 365 Copilot answering from any deal folder the user can open |
| K2 | Sanctioned AI tool that receives what a user submits | B1 | An enterprise chatbot licence; AI features inside Office, email or the browser |
| K3 | Embedded AI in collaboration and meeting tools | B1 | Meeting transcription and recap; AI notetakers invited to deal calls |
| K4 | Unsanctioned AI reached from a managed device | B1 | A consumer chatbot opened in the browser on a company laptop |
| K5 | Personal device | B3 | A chatbot on a phone, with a deal document photographed or a paragraph retyped |
| K6 | Data-room and document movement | B1 or B2 | Exports, downloads, prints and forwards that land a document where a K1 to K5 channel can reach it |
| K7 | Adviser tooling | B2 | Each adviser's own AI tools, one entry per adviser |

A ban on a tool does not remove a channel. It usually moves a K2 or K4 channel to K5, where the company's controls do not reach. The register records the move.

### 2.4 The information classes

Each channel is tagged with the highest class of deal information it can reach. Classes are descriptive; counsel determines their legal character.

| Code | Information class | Illustration |
| --- | --- | --- |
| I1 | The existence of the deal and the counterparty | Code name resolved; a calendar entry; an adviser's name |
| I2 | Process and timetable | Bid dates, exclusivity, conditions precedent |
| I3 | Price, terms and structure | Offer price, consideration, earn-outs |
| I4 | Valuation and synergy models | Assumptions, synergy lines, sensitivities |
| I5 | Due diligence findings | Technical, financial and legal findings about either party |
| I6 | Board papers and recommendations | The board's position and the reasons for it |

### 2.5 The set

The assessment covers every channel for one deal. The default register is 12 to 25 channels: one or two per channel kind in the company's own estate, one per adviser, and one per data-room movement path. Selection is not needed; completeness is. A channel the company says does not exist is still entered, with the reason, so the register shows it was considered.

### 2.6 In scope

- Every path by which deal information held by the company, its deal team or its insider list can reach an external AI model.
- The terms that govern each sanctioned tool and each adviser's tooling.
- The settings the company holds today: tenant configuration, DLP, sensitivity labels, information barriers, web filtering, the enterprise assistant policy, device management.
- The confidentiality deed, each adviser's engagement letter, and any AI-use direction already issued for the deal.

### 2.7 Out of scope

- **Legal advice.** Whether any information was price-sensitive, whether any obligation was engaged, what the deed requires, and the privilege position are DLC Legal's.
- **Deal content.** No deal document is read. Folder names, document counts and dates are the most the register holds.
- **System access.** No tenant is connected to, queried or tested. Configuration evidence is a dated export supplied by the tenant owner.
- **Deal data and personal data.** No prompt logs, chat histories or individual submissions are read. Logs are assessed for whether they exist, what they capture, and for what period.
- **Provider involvement.** No AI vendor is approached. Terms are read from the licence and documentation the company holds.
- **Advisers' internal systems.** Advisers are asked what their tooling can reach and what they can attest; no adviser system is examined.
- **Forensics.** The assessment establishes what could be shown. It does not investigate whether anything left.
- **Products and gap closing.** Closing the residual gap is a separate decision for the company after the findings.

## 3. Framework at a glance

Three instruments are applied in four steps, the same way to every channel for every deal.

### 3.1 The three instruments

| Instrument | What it is | Section |
| --- | --- | --- |
| Channel register | One entry for each path by which deal information can reach an external model, with a fixed set of fields | 6 |
| The five questions | The ordered questions put to every channel. Two sit under all of them: what can the company require, and what can actually be shown | 7 |
| Non-egress evidence ladder | A scale of what the company could show about a channel, matched to what the channel can reach | 8 |

### 3.2 The four steps

1. **Fix the deal profile.** The deal code name, the deal team and insider list, the deal folders by name, the advisers, and the privilege position. Agreed with the GC or the executive who approved the brief.
2. **Register the channels.** Every channel of every kind, with the terms, settings and records that govern it today. Each becomes a register entry.
3. **Classify and test.** The reach and information class of each channel, the indicative rung, and the evidence obtainable.
4. **Questions to counsel.** Legal questions go to DLC Legal in writing. Counsel sees every draft first. Counsel's determinations are recorded against each entry and the finding is set.

### 3.3 The logic of a finding

Each channel produces three positions on the ladder. The finding is the relationship between the last two.

| Position | Meaning | Set by |
| --- | --- | --- |
| Indicative rung | The evidence type that corresponds to what the channel can reach | Triodian, by rule (section 8.3) |
| Required rung | The evidence the company can reasonably require for this channel, given its rights over it | The company and counsel |
| Obtainable rung | The highest evidence type that can in fact be produced for the deal window and independently checked | Triodian, by test (section 8.4) |

### 3.4 The residual gap

Every channel that accepts typed or pasted text has the same gap: a paraphrase of a deal paragraph, or fragments across many prompts that add up to the deal, pass every control the company owns, because those controls check files, patterns and destinations and none reads meaning. The ladder has a rung for the control that would close it (N6). No control the company has deployed reaches that rung. The assessment names the gap on every channel where it exists, names the class of control that would close it, and leaves the decision to the company. It does not name a product.

### 3.5 Operating principles

- **No deal content.** The register holds channels, terms, settings and records. Nothing else.
- **Start from what exists.** The company's own settings, policies and letters are the first input. Most of the register closes with configuration and contract.
- **"No reasonable reach" is a conclusion.** It is documented as a finding, not treated as a gap.
- **Solution-agnostic.** The test is the company's duty, not Triodian's: can the evidence be produced, and can someone independent check it?
- **The work can stop at the findings.** The register and findings are usable whether or not anything follows.

## 4. Roles and governance

### 4.1 Parties

| Party | Role | Engaged by | Where it stops |
| --- | --- | --- | --- |
| The company | Client. The CEO or board approves the brief, the fee and the privilege position. The CFO's deal team, the advisers and the tenant owner hold the channels | n/a | n/a |
| DLC Legal | Leads the engagement, holds the client, engages Triodian, owns every legal call, drafts the deal confidentiality protocol and board paper | The company | n/a |
| Triodian | Technical party. Does the assessment and the register. Responsible for the result | DLC Legal | Gives no legal advice. Presents no product. Closes the residual gap only if the company asks, under a separate direct engagement |
| Independent checker | Checks Triodian's assessment and reports to DLC Legal | DLC Legal, separately from Triodian (to be confirmed) | Does not do the assessment or build any control. Gives no legal advice |

### 4.2 Responsibility by activity

R = does the work. A = accountable for it. C = consulted. I = informed.

| Activity | CEO or GC | Deal team lead | Tenant owner | Advisers | DLC Legal | Triodian | Checker |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Approve the brief, fee and privilege position | A | I | I | I | R | C | I |
| Fix the deal profile | A | C | C | I | R | C | I |
| Supply letters, deed, policies and configuration export | A | R | R | R | C | I | I |
| Build the channel register | I | C | C | C | I | A, R | I |
| Classify reach and information class | I | C | C | I | C | A, R | I |
| Test evidence obtainability | I | C | C | C | C | A, R | I |
| Determine rights, required evidence and reach | A | I | I | I | R | C | I |
| Draft findings, 90-day plan and technical annex | I | C | C | I | C | A, R | I |
| Check the assessment and its findings | I | I | I | I | A | C | R |
| AI-use direction, adviser clauses, deed terms, board paper | A | I | I | I | R | C | I |

### 4.3 Team

| Role | Person | Responsibility in the assessment |
| --- | --- | --- |
| Method owner | Damian Hickey | Scope, sequence and the evidence each stage has to produce. Signs the technical annex |
| Delivery manager | Leon Cosgrove | Plan, document requests, interview schedule, exceptions log |
| AI architect | Abhishek Gupta | Technical reading of each tool and setting: what it reaches, what it retains, what record it leaves |
| Validation | Sam Ferraro PhD | Checks the measures without having written them, before anything goes to counsel or the checker |

### 4.4 Rules of engagement

- **Counsel first.** Every draft goes to DLC Legal before anyone at the company sees it.
- **Legal questions in writing.** Any point needing a legal view is logged as a numbered question to counsel (section 9.5) and is not answered in a working paper.
- **Privilege.** The work is scoped through counsel on the privilege position DLC Legal determines. Marking, storage and circulation follow its instruction. The privilege marking appears on the first line of every output.
- **One technical party.** DLC Legal deals with Triodian for all technical matters.
- **Advisers through the company.** Any question to an adviser goes through the company's deal team lead or through DLC Legal, never directly from Triodian.
- **Independence of the check.** The checker receives the register, worksheets and annex from DLC Legal, not from Triodian, and reports to DLC Legal.

## 5. Workplan

Two weeks, ten working days. The plan assumes documents D1 to D9 arrive by day 2 and counsel answers questions within two working days.

### 5.1 Phases

| Phase | When | Activities | Output | Exit gate |
| --- | --- | --- | --- | --- |
| 0. Mobilise | Before day 1 | DLC Legal confirms the brief with the executive who approved it. Privilege position and document handling set. Deal code name chosen. Document request issued | Confirmed brief. Document request list. Named contacts | Brief confirmed in writing by DLC Legal |
| 1. Deal profile | Days 1 to 2 | Record the deal team and insider list by role and count, the deal folders by name, the advisers, the sanctioned tools, the device policy. Agree the profile with the GC | Deal profile (section 6.1) | GC and DLC Legal agree the profile |
| 2. Register the channels | Days 2 to 5 | Interview the deal team lead, the tenant owner and the data-room administrator. Read the licence terms, letters and deed. Enter one channel per kind per estate, and one per adviser | Register with fields 1 to 14 complete (section 6.2). Source index | Every entry has a source and a date. Every channel kind considered |
| 3. Classify and test | Days 5 to 8 | Classify reach and information class. Set the indicative rung. Run the obtainability test. Perform the five-minute demonstration if counsel allows. Validation | Register fields 15 to 22 complete. Rationale per entry. Draft worksheets | Validation passed with no open exceptions |
| 4. Questions to counsel | Days 5 to 9 | Issue the numbered question set to DLC Legal as questions arise. Record determinations on rights, reach and required rung | Question log with responses. Fields 23 to 25 complete | Every question answered, or open with an owner |
| 5. Findings and plan | Days 8 to 10 | One finding per channel. The 90-day plan from what exists. The residual gap named. Technical annex drafted. Draft to counsel first | Finding worksheets. 90-day plan. Technical annex, draft | DLC Legal accepts the draft for the check |
| 6. Check | Day 10, or the following week if an external checker is confirmed | The pack goes to the checker through DLC Legal. Triodian answers queries through the same line | The check, reported to DLC Legal. Final annex | Check confirmed complete |
| 7. Close | After the check | Register and annex handed to DLC Legal for its protocol and board paper. Working papers archived as DLC Legal directs | Final register. Closure note | DLC Legal's advice issues with the annex attached |

### 5.2 Document request list

Issued in phase 0 through DLC Legal. No document contains deal content; where one would, a redacted or structural version is requested.

| Ref | Document | Used for |
| --- | --- | --- |
| D1 | Deal team and insider list, by role and count (names only if counsel permits) | Deal profile; B3 channels |
| D2 | Deal folder structure: locations, folder names, sharing settings, document counts. No documents | K1 reach; K6 paths |
| D3 | Adviser list with each engagement letter and any side letter | K7 entries; what each letter requires on information handling and AI |
| D4 | The confidentiality deed and any counterparty protocol | What the company has undertaken; what it must show |
| D5 | Tenant configuration summary exported by the tenant owner: enterprise assistant scope and policy, DLP rules, sensitivity labels, information barriers, web filter categories, retention | K1 to K4 settings; N3 evidence |
| D6 | Licence terms and data-handling documentation for each sanctioned AI tool | K2, K3 terms: retention, training, logging, residency |
| D7 | Data-room provider terms, AI feature settings, export and watermark settings, access and export log availability | K6 entries |
| D8 | Device policy: managed devices, BYOD, mobile device management, app controls | K4, K5 |
| D9 | AI acceptable-use policy and any AI-use direction already issued for the deal | N1 evidence; what staff have been told |
| D10 | Existing assurance over the above: internal audit, security certifications, prior DLP reviews | What existing assurance already covers |

### 5.3 Interviews

| Who | Purpose | Length |
| --- | --- | --- |
| GC, or the executive who approved the brief | Confirm the profile and the privilege handling. Hear what the company believes it could show today | 30 min |
| Deal team lead, CFO's office | How the team works: tools in daily use, late-night habits, what is pasted where, what has been told to the team | 45 min |
| Tenant owner or head of IT security | Walk through D5. What each setting reaches and does not. What logs exist and for how long | 60 min |
| Data-room administrator | Export paths, AI features in the room, what the room logs | 30 min |
| Each adviser's relationship lead, through the company | What their tooling can reach, what their firm policy says, what they can attest in writing | 20 min each |

### 5.4 The five-minute demonstration

Performed in phase 3, in front of the CEO and CFO if DLC Legal allows, using nothing not already in the room.

1. Take one redacted paragraph from a past deal, or from this one if counsel allows: a valuation assumption, a synergy line, a condition precedent.
2. Paraphrase it as a diligent analyst would before asking an AI tool for help. No names, no numbers that match a pattern.
3. Run it past the company's controls: DLP, labels, the web filter, the assistant policy. Record which pass it.
4. Ask what the record would show if it had gone out.

The demonstration is not an evidence item and produces no finding on its own. The annex records whether it was performed, on what text, and which controls passed the paraphrase. It is the moment the question stops being an IT setting and becomes a board question.

## 6. Channel register

### 6.1 Deal profile

Recorded once per assessment. The profile replaces the calibration set used in the AI Use Assessment; it is small and is set by counsel and the GC, not by a board process.

| # | Field | Format |
| --- | --- | --- |
| P1 | Deal code name | As chosen by counsel |
| P2 | Deal stage | Pre-approach · in diligence · signed, pre-completion · completed within 90 days |
| P3 | Deal team size and insider list size | Counts by role |
| P4 | Deal folders | Location and folder name, with sharing scope and document count |
| P5 | Advisers | Firm type and role for each: bank, law, technical, accounting, data-room provider |
| P6 | Sanctioned AI tools | Each tool, licence tier, and whether its scope reaches P4 |
| P7 | Device policy | Managed only · managed plus BYOD · unmanaged permitted |
| P8 | Privilege marking | As DLC Legal instructs |
| P9 | Counsel turnaround | Working days agreed for questions |

### 6.2 Fields

The deck names the register's purpose and four outputs. The 25 fields below break the register into items a reviewer can test one at a time.

| # | Field | Allowed values or format | Completed by | Phase |
| --- | --- | --- | --- | --- |
| 1 | Entry ID | CH-01 onward | Triodian | 2 |
| 2 | Channel kind | K1 to K7 (section 2.3) | Triodian | 2 |
| 3 | Boundary | B1, B2, B3 | Triodian | 2 |
| 4 | Who uses it | Deal team · insider list · adviser · everyone with folder access | Triodian | 2 |
| 5 | Tool or service | Name and licence tier, or "any consumer tool" for K4 and K5 | Triodian | 2 |
| 6 | Provider and model behind it | Legal entity names, or "not known" | Triodian | 2 |
| 7 | Location of processing and retention | Country, or "not known" | Triodian | 2 |
| 8 | How information enters the channel | Scope over stored content · paste or type · upload · transcription · export then re-entry | Triodian | 2 |
| 9 | Terms on retention, training, logging and human review | Clause references with verbatim extracts, or "consumer terms" or "not known" | Triodian | 2 |
| 10 | Settings in force today | From D5, D7, D8: the specific setting, its value, and the export date | Triodian with tenant owner | 2 |
| 11 | Records the channel leaves | What is logged, where, for how long, who can retrieve it | Triodian with tenant owner | 2 |
| 12 | Direction given to users of this channel | The AI-use direction or policy text that covers it, or "none" | Triodian | 2 |
| 13 | Terms the company holds over the channel's owner | For B2: the letter or deed clauses on information handling, AI and attestation, verbatim. For B1: "own estate". For B3: "direction only" | Triodian | 2 |
| 14 | Sanctioned status | Sanctioned · tolerated · banned · banned, use moved to K5 | Triodian | 2 |
| 15 | Reach | R1 to R4 (section 8.1) | Triodian | 3 |
| 16 | Information class reachable | I1 to I6 (section 2.4), the highest | Triodian | 3 |
| 17 | Indicative rung | N0 to N6 (section 8.3) | Triodian, by rule | 3 |
| 18 | Evidence the company holds today | Rung and description, or "none" | Triodian | 3 |
| 19 | Evidence the channel could produce | The record or export and where it would be generated | Triodian | 3 |
| 20 | Independently checkable | Yes · no · partly, with reason | Triodian | 3 |
| 21 | Obtainable rung | N0 to N6 (section 8.4) | Triodian, by test | 3 |
| 22 | Confidence in obtainability | High · medium · low | Triodian | 3 |
| 23 | Rights determination | Counsel's wording on what the company can require over this channel, with question reference | DLC Legal | 4 |
| 24 | Required rung | N0 to N6 | DLC Legal | 4 |
| 25 | Finding, closing route and owner | F1 to F5 (section 9.1), route (section 9.3), named owner | Triodian, after counsel | 5 |

### 6.3 Completion rules

- **Every value has a source.** Each field carries a source reference (document and page, or interview and date). A value without a source is recorded as "not known", never estimated.
- **No deal content, anywhere.** A reviewer who finds a price, a counterparty name, a model figure or a document extract in any field records an exception and the field is cleared.
- **Field 8 is descriptive, field 15 is the judgement.** How information enters is written before reach is set, so a reviewer can re-derive reach from it.
- **Fields 23 and 24 are never completed by Triodian.** They are transcribed from counsel's written response, with the question number.
- **Banned tools stay on the register.** A banned K2 or K4 channel is kept with field 14 set, and a K5 entry is added for where the use goes.
- **"Not known" is a valid entry and is counted.** The annex reports how many fields are not known, by channel kind.
- **Confidence is low by default at B2.** No adviser system is examined, so a K7 rung rests on the letter and the adviser's statement.
- **One classifier, one reviewer.** Fields 15 to 22 record who classified and who reviewed. They cannot be the same person.

## 7. The five questions

The questions are worked in order for every channel. The determination at each step is the company's and its counsel's. Triodian supplies the framework and the facts each determination needs.

### 7.1 Question set

| # | Question | Answer scale | Determined by | Facts Triodian supplies | Register fields |
| --- | --- | --- | --- | --- | --- |
| 1 | Who can reach this channel, and with what deal information? | Reach R1 to R4; information class I1 to I6 | Triodian classifies; deal team lead confirms | Who uses it, how information enters, scope over folders | 4, 8, 15, 16 |
| 2 | What governs the channel: whose terms, whose settings, whose direction? | Own estate · adviser's estate under letter or deed · personal, direction only | Triodian records; counsel determines what the terms mean | Verbatim terms, settings in force, direction given | 9, 10, 12, 13 |
| 3 | What record does the channel leave, and who can retrieve it? | None · tool-side only · company-retrievable · adviser-retrievable | Triodian | What is logged, retention period, retrieval route | 11, 19, 20 |
| 4 | What can the company require over this channel? | For B1: anything it configures. For B2: what the letter or deed gives. For B3: direction and acknowledgement | Counsel | Field 13 extracts; next contracting point for each adviser | 13, 23, 24 |
| 5 | What evidence can be shown that the information did not leave, or of what left and when? | N0 to N6 | Counsel determines the required rung; Triodian tests obtainability | Indicative rung, evidence held, evidence producible, checkability | 17 to 22, 24 |

### 7.2 Tests under each question

**Q1, reach.** Three tests, each answered from the sources:

1. Can the channel answer from stored deal content without a person pasting it? (K1: yes if the assistant's scope includes any deal folder the user can open.)
2. Can a person put whole documents into it, or only typed and pasted text?
3. Does it receive content without anyone deciding to submit it? (K3 transcription; K6 automatic sync.)

The reach class follows from the answers (section 8.1). The information class is the highest class in any folder or document the channel can reach.

**Q2, governance.** For each channel Triodian extracts, without interpretation: any term on retention and deletion; any term on use of submitted content for training or product improvement; any term on logging and on who may access logs; any term on human review by the provider; any term on data residency; and, for B2, any clause in the engagement letter or deed that reaches the adviser's use of AI, or that would, and the next point at which the letter can be amended. Whether a term is sufficient is a question to counsel.

**Q3, record.** Triodian records what the channel logs, whether the log captures submitted content or only metadata, how long it is kept, and who can retrieve it. The assessment asks whether a log exists and what it would show. It does not read any log.

**Q4, rights.** Triodian does not answer this. It supplies the extracts and the contracting points. Three points are flagged for counsel on every B2 channel: whether the letter reaches the adviser's sub-advisers and platforms; whether an attestation can be required and in what form; and whether the deed's obligations on the company extend to what its advisers do.

**Q5, evidence.** Split into two halves and kept separate throughout:

- **What can be required** is counsel's determination and becomes the required rung.
- **What can be shown** is Triodian's test (section 8.4) and becomes the obtainable rung.

### 7.3 Stop rules

- **B3 with direction only.** If the only lever is a direction to an individual, the indicative rung is N1 and the test asks only whether a direction exists and was acknowledged. The residual gap is recorded (section 9.1, F5).
- **Counsel finds no reasonable reach.** The channel is recorded as F3. Q1 to Q3 are still completed so the conclusion is documented against what the channel can reach.
- **Facts unavailable.** Where the documents do not show what a tool retains, what an adviser's tooling can reach, or what a setting is, the entry is recorded as F4 with the specific question that would resolve it.

## 8. Classification and the non-egress evidence ladder

### 8.1 Reach classes (question 1)

| Code | Reach | Deciding test | Illustration |
| --- | --- | --- | --- |
| R1 | Typed and pasted text only | A person must type or paste; no file upload; no scope over storage | A chatbot with upload disabled |
| R2 | Documents a person chooses to submit | Upload or attach, one document at a time | A chatbot with upload; an AI feature inside a document editor |
| R3 | Stored content the user can open | The tool answers from folders, mailboxes and chats within the user's permissions | An enterprise assistant with default scope over the tenant |
| R4 | Content it receives without a submission | Transcription, recording, automatic sync, data-room AI features | A meeting notetaker; a data room's built-in summariser |

Where a channel fits two classes, the higher is recorded and the reason noted.

### 8.2 Exposure consequence (used in the gap rating)

| Code | Consequence | Meaning for the assessment |
| --- | --- | --- |
| X1 | Immaterial | Information class I1 only, already public or about to be |
| X2 | Deed and letter consequence | Classes I1 to I2 reachable; the counterparty's deed is engaged |
| X3 | Process consequence | Classes I3 to I5 reachable; price, rival bid or process at stake |
| X4 | Disclosure and trading consequence | Classes I3 to I6 reachable by anyone outside the insider list |

The code is a technical label for the information the channel can reach. Whether any disclosure or trading provision is engaged is counsel's determination and is never stated by Triodian.

### 8.3 The non-egress evidence ladder (question 5)

| Code | Rung | What the company holds | Produced by | Closes the paraphrase gap |
| --- | --- | --- | --- | --- |
| N0 | None | Nothing | n/a | No |
| N1 | Direction | A written AI-use direction covering the channel, issued to the deal team and insider list, with acknowledgements and dates | DLC Legal drafts; deal team lead issues | No |
| N2 | Attestation | A signed statement from the tool provider's terms or from an adviser: what the tool retains, whether content trains any model, what the adviser's tooling can reach, over the deal window | The provider's terms; the adviser | No |
| N3 | Configuration | A dated export of the settings in force: assistant scope, DLP rules, labels, barriers, web filter, device policy, with change history for the deal window | The tenant owner | No |
| N4 | Record | A retrievable log of what crossed the channel in the deal window: submissions, uploads, exports, transcriptions, with who and when, capturing enough to answer "what left" | The tenant owner; the data-room provider; the adviser | Partly: shows what left, after the fact |
| N5 | Containment | Evidence that the channel cannot reach deal content at all for the deal window: assistant scope excluding the deal folders, barriers between the deal team and the rest, uploads disabled, data-room AI features off | The tenant owner; the data-room provider | For R3 and R4 reach only |
| N6 | Meaning control | A control at the boundary that reads the meaning of outbound text against the deal's sensitive content, independent of the AI, with a signed record per submission of what was requested, what applied and what was allowed | A control not yet deployed in the company's estate | Yes |

**Indicative rung.** The base rule pairs each reach class with one rung.

| Reach class | R1 | R2 | R3 | R4 |
| --- | --- | --- | --- | --- |
| Indicative rung | N4 | N4 | N5 | N5 |

**Adjustment for boundary (proposed, for confirmation).**

- B2 channels: the indicative rung is capped at N4, since the company configures nothing in an adviser's estate. N5 is reached at B2 only where the adviser attests to containment.
- B3 channels: the indicative rung is N1. Nothing above N1 can be produced for a personal device.

Every adjustment is recorded with its reason. The indicative rung is a technical starting point. Which rung applies is a determination for the company and its counsel.

### 8.4 Obtainability test

The test starts at the indicative rung and steps down one rung at a time until all five conditions pass. That rung is the obtainable rung.

| # | Condition | Question | Source |
| --- | --- | --- | --- |
| T1 | Produced | Does a record, export or statement of this type exist, or could it be produced from what is already in place without new tooling? | D5 to D9, interviews |
| T2 | Deal-scoped | Can it be produced for this deal window and this deal team without exposing deal content or individuals' personal data beyond what the question needs? | Nature of the record |
| T3 | Reachable | Is there a route for the company to obtain it: it holds the setting, or a term in a letter or deed gives it, or a contracting point exists where one could be added? | Fields 10, 13 |
| T4 | Checkable | Can someone independent of the party producing it verify it? | Field 20 |
| T5 | Timely | Can it be produced within the time the company would need to act on it and meet any notification obligation counsel identifies? | Retention periods, retrieval route |

T3 records whether a term or setting exists and what it says. Whether the term is sufficient or enforceable is a question to counsel.

**Confidence.** High where the export, log sample or attestation has been seen. Medium where the documentation describes it. Low where the rung is inferred from the type of tool.

### 8.5 Worked illustration

Illustrative only, not drawn from any client.

| Field | Entry |
| --- | --- |
| Channel | K1, the enterprise assistant, B1 |
| How information enters | Scope over all SharePoint and mailbox content the user can open, including the two deal folders |
| Reach | R3 |
| Information class | I6: the board paper folder is within scope for the deal team |
| Indicative rung | N5 by base rule |
| Evidence held today | N3: a configuration export showing default scope; no restriction on the deal folders |
| Obtainability | N5 fails T1 (restricted content discovery not applied to the deal folders; could be, without new tooling, so T1 passes on "could be produced"; T3 passes; T4 passes with a dated export; T5 passes). N5 obtainable |
| Obtainable rung | N5, high confidence once the export is seen |
| Finding | F2 at 0 rungs if counsel requires N5 and the setting is applied in the 90-day plan; F5 recorded beside it, because the assistant still accepts pasted paraphrase |
| Question to counsel | Does the deed require the company to show containment over its own estate, and by when? |

A second illustration, for contrast: K5, a phone, B3. Reach R1. Indicative N1. Evidence held N0 (no direction issued). Obtainable N1 once DLC Legal's direction issues and acknowledgements are collected. Finding F2 at one rung with owner the deal team lead, and F5 recorded beside it.

## 9. Findings and the 90-day plan

### 9.1 Finding types

One finding is recorded per channel after counsel has set the required rung. The deck names "a finding per channel", "no reasonable reach" and "the residual gap, marked honestly". F4 and the separate F5 code are proposed here.

| Code | Finding | Condition | What is recorded |
| --- | --- | --- | --- |
| F1 | Shown | Obtainable rung is at or above the required rung | The evidence, who produces it, how it is checked |
| F2 | Gap, closable from what exists | Obtainable rung is below the required rung, and the route to close it is configuration, contract or direction | The gap in rungs, which test failed, the route, the owner and the 90-day step |
| F3 | No reasonable reach | Counsel determines the company cannot reasonably require evidence over this channel | Counsel's determination and its basis, with the technical classification beside it |
| F4 | Not determinable on documents (proposed) | The documents do not show what the channel retains or reaches | The question that would resolve it, and who could answer it |
| F5 | Residual gap, meaning (proposed) | The channel accepts typed or pasted text, and no deployed control reads meaning | Recorded beside F1 or F2, never instead of them. Names the class of control that would close it and the earliest horizon. Names no product |

F5 is expected on most B1 and B3 channels. Reporting it on each channel, rather than once in the annex, is deliberate: the board paper then shows the gap's extent, not only its existence.

### 9.2 Gap rating (proposed, for confirmation)

Gap size is the required rung minus the obtainable rung. Priority combines gap size with exposure consequence.

| Gap size | X1 | X2 | X3 or X4 |
| --- | --- | --- | --- |
| 1 rung | Low | Low | Medium |
| 2 rungs | Low | Medium | High |
| 3 or more rungs | Medium | High | High |

A gap at low confidence is reported at its rated priority with the confidence shown beside it. F5 carries no rating; it is reported by count and by the information classes it covers.

### 9.3 Closing routes and the 90-day plan

Each F2 names one route and one owner. The plan lists the F2 steps by owner and by week, ordered by priority. Who closes F5, and with what, is a separate decision for the company.

| Failed test | Usual route | Usual owner | Typical 90-day step |
| --- | --- | --- | --- |
| T1, produced, at B1 | Configuration | Tenant owner | Restrict assistant scope over the deal folders; apply barriers; enable retrievable logging; disable AI features on the data room |
| T1, produced, at B2 | Contract | DLC Legal, through the GC | Attestation and record terms in the adviser letter at the next amendment, with the register beside the clauses |
| T1, produced, at B3 | Direction | Deal team lead, with DLC Legal's text | Issue the AI-use direction; collect acknowledgements; add it to the insider list process |
| T2, deal-scoped | Configuration | Tenant owner | Scope logs and exports to the deal team and window |
| T3, reachable | Contract | DLC Legal | Clause in the letter or deed; or the finding records that no contracting point falls within 90 days |
| T4, checkable | Process | GC | Nominate who verifies the export or attestation; keep the dated copy |
| T5, timely | Process | Tenant owner; data-room administrator | Confirm retention covers the window; agree retrieval time |
| Residual (F5) | Separate decision | The company | A control that reads meaning at the boundary. Not part of this plan |

### 9.4 Finding worksheet

One worksheet per channel. It is the working paper the checker reviews and the source for the annex.

| Part | Contents |
| --- | --- |
| A. Identification | Channel ID, kind, boundary, worksheet version, preparer, reviewer |
| B. Path | How deal information reaches the channel, from folder to model, with the parties on the way |
| C. Facts | Register fields 4 to 14, each with its source reference |
| D. Classification | Reach and information class, each with a two-line rationale tied to part C |
| E. Ladder | Indicative rung, any adjustment and reason, evidence held today |
| F. Obtainability | Result of T1 to T5 at each rung tested, the obtainable rung and confidence |
| G. Questions to counsel | Each question, date sent, response, date received |
| H. Counsel's determinations | Fields 23 and 24, transcribed with question references |
| I. Finding | Type, gap size and priority, failed test, route, owner, 90-day step; F5 beside it if it applies |
| J. Not known | Every field recorded as not known, and what would resolve it |

### 9.5 Question-to-counsel template

| Field | Contents |
| --- | --- |
| Reference | QC-01 onward |
| Channel | CH ID |
| Which of the five questions | 2, 4 or 5 |
| Facts | What the documents show, with source references. No characterisation, no deal content |
| Question | One question, answerable with a determination |
| Why it matters to the assessment | Which register field and which test depend on it |
| Response | Counsel's wording, unedited |
| Status | Open · answered · open with owner |

## 10. Deliverables

### 10.1 What Triodian produces

| # | Deliverable | Contents | Accepted when |
| --- | --- | --- | --- |
| CD1 | Channel register | All 25 fields for every channel. Source index. Count of not-known fields by kind | Every channel kind considered; every entry has a finding or is recorded F4; no field blank |
| CD2 | Finding per channel | One worksheet per channel (section 9.4). A one-page summary table: channel, kind, boundary, reach, class, indicative, required, obtainable, finding, priority, F5 flag | Each worksheet reviewed; each rung traceable to a test result |
| CD3 | 90-day plan from what exists | Every F2 step by owner and week, with the setting, clause or direction it uses, and what evidence it will produce when done | Each step names an owner who holds the setting, the letter or the team |
| CD4 | The residual gap, marked | The channels carrying F5, the information classes they reach, the class of control that would close it, the earliest horizon, and what the company would be able to show once it existed. No product named | DLC Legal confirms the language rules in 10.4 are met |
| CD5 | Technical annex, in Triodian's name | Method, deal profile (code name only), summary table, findings, the demonstration record, limitations, not-known count, statement of what was not done | Validation complete; the check complete and its points closed or disclosed |

### 10.2 What DLC Legal produces

Listed so the interfaces are clear. These are not Triodian deliverables.

| Deliverable | Depends on from Triodian |
| --- | --- |
| Deal confidentiality protocol | The register and the 90-day plan |
| AI-use direction to the deal team and insider list | B3 and K2 to K4 entries; what each channel does with what is submitted |
| AI clauses for adviser letters and the deed | K7 entries, the extracts in field 13, the contracting points, and the attestation items at N2 and N4 |
| Board paper on AI use during the deal, in the firm's name | The technical annex (CD5) and the residual gap (CD4) |
| Privilege position and every legal call | The question log |

### 10.3 Technical annex outline

1. Purpose, and the question the assessment answers
2. What was and was not done: no deal content, no system access, no logs read, no vendor or adviser system examined, no forensics, no legal advice
3. The deal profile, by code name, and the channel kinds covered
4. Method: register, five questions, ladder, obtainability test
5. The five-minute demonstration: whether performed, on what text, which controls passed
6. Summary table of findings
7. Finding by channel
8. The 90-day plan, by owner
9. The residual gap: extent, classes reached, class of control, horizon
10. Patterns: which test fails most, and at which boundary
11. Limitations and confidence, including the not-known count
12. Appendices: register extract, question log, source index, exceptions log

### 10.4 Language rules for every deliverable

- State what the documents show and what the classification is. Do not state what the law requires, what is price-sensitive, or whether anything was breached.
- Use "indicative" for Triodian's rung and "required" only for counsel's.
- Use "gap" only where counsel has set a required rung above the obtainable one. Use "residual gap" only for F5.
- Name no product, including Triodian's and Pinpole's. Describe the N6 control by what it does.
- No deal content, name, figure or document extract appears anywhere. The deal is its code name.
- Report channels and settings, never individuals' submissions.

## 11. Relationship to the AI Use Assessment

The deal assessment is one instance of the general method. The two registers are designed to join.

| Deal assessment | AI Use Assessment | Join |
| --- | --- | --- |
| Channel (K1 to K7) | Entry at boundary B3, the company's own use of an external AI service | A K1, K2 or K3 channel becomes a B3 entry with authority A1, productivity |
| Reach R1 to R4 | Fields 11 to 13: what the AI does, human involvement, credentials | R3 and R4 map to "the output is produced without a person submitting" |
| Information class I1 to I6 | Failure consequence C1 to C5 | Counsel maps classes to the company's thresholds if an appetite is later set |
| Non-egress ladder N0 to N6 | Evidence ladder E0 to E6 | N6 and E6 are the same class of control, read at the boundary |
| Finding F1 to F5 | Finding F1 to F4 | F5 has no counterpart; it becomes an F2 against E6 once an appetite exists |

A register extract from the deal assessment can seed a later AI Use Assessment for the same client, so that a deal client's second engagement starts from a register rather than from nothing.

## 12. Quality control

### 12.1 Review points

| # | Review | When | Reviewer | Tests |
| --- | --- | --- | --- | --- |
| R1 | Profile review | End of phase 1 | DLC Legal and GC | Profile agreed; every channel kind listed for consideration |
| R2 | Register completeness | End of phase 2 | Delivery manager | Fields 1 to 14 complete or not known; every value sourced and dated; no deal content in any field |
| R3 | Classification review | During phase 3 | A second Triodian reviewer, not the classifier | Reach re-derived from field 8 without sight of the original; differences resolved and logged |
| R4 | Validation | End of phase 3 | Sam Ferraro | Rules in 8.3 and 8.4 applied consistently; every adjustment has a reason; every obtainable rung has five test results |
| R5 | Legal-line and content check | Before any draft leaves Triodian | Method owner | No sentence states what the law requires; no deal content; "required", "gap" and "residual gap" used only as 10.4 allows; no product named |
| R6 | Counsel review | Phase 5 | DLC Legal | Draft seen by counsel first; determinations transcribed accurately |
| R7 | Check | Phase 6 | Independent checker, or validation if none is confirmed | Is the assessment sound, and are its findings supported? |

### 12.2 Evidence standards

- **Traceable.** From any finding to the test results, to the register fields, to the source document and page.
- **Reproducible.** A second classifier given the same part C facts reaches the same reach class and rung. R3 tests this on every entry.
- **Dated.** Every configuration export carries the date exported and the date read. Settings change; the register records what was in force on the date.
- **Verbatim where it matters.** Terms, clauses and counsel's determinations are quoted, not paraphrased.
- **Disagreements kept.** Where classifier and reviewer differed, both positions and the resolution stay on the worksheet.

### 12.3 Working papers

- Marked, stored and circulated as DLC Legal directs under the privilege position it determines.
- Versioned. Each worksheet shows preparer, reviewer and date for every version.
- No deal content is collected. If a document supplied contains it, it is returned and a structural or redacted version requested.
- No prompt history, chat log or individual submission is collected or read.
- No adviser or vendor confidential material is sought beyond the terms the company already holds.
- Retained or destroyed at close as DLC Legal directs.

### 12.4 Exceptions log

Any departure from this framework is logged with the reason and who approved it: a channel kind not considered, an interview not held, a document not supplied, deal content found in a field, a review point skipped. The log is an appendix to the annex.

### 12.5 Measures reported at close

| Measure | Purpose |
| --- | --- |
| Channels by kind and boundary | Shows what the register covered |
| Fields not known, by kind | Shows how much rests on missing facts |
| Findings by type and priority | The headline result |
| F5 count and the information classes it reaches | The extent of the residual gap |
| Obtainable rungs by confidence | How firm the result is |
| Failed tests by type and boundary | Where evidence breaks down |
| 90-day steps by owner | What the plan asks of whom |
| Classifier and reviewer differences | How repeatable the classification was |
| Questions to counsel: sent, answered, open | What remains undetermined |

## 13. Assumptions, dependencies and open items

### 13.1 Assumptions

- The register is 12 to 25 channels. A company with many advisers or several sanctioned tools extends phase 2 by a day or two within the fixed fee; beyond that, the brief is revisited through DLC Legal.
- Documents D1 to D9 arrive by day 2. Late documents move the plan day for day.
- DLC Legal answers questions within two working days.
- The tenant owner can export configuration without Triodian touching any system.
- The independent check fits in the second week only if the checker is confirmed before day 1; otherwise validation stands as R7 and an external check follows.

### 13.2 Dependencies

| Dependency | Owner | Needed by |
| --- | --- | --- |
| Confirmed brief, fee and privilege position | CEO or board, DLC Legal | Before day 1 |
| Deal code name and profile | DLC Legal, GC | Day 2 |
| Documents D1 to D10 | Company, through DLC Legal | Day 2 |
| Interview access, including advisers through the company | Deal team lead | Days 2 to 5 |
| Counsel's determinations | DLC Legal | Day 9 |
| Check | Checker, through DLC Legal | Day 10 or following week |

### 13.3 Drafted here, to be confirmed

None of these is in the DLC Legal deck. Each was added to make the method executable.

- [ ] **The seven channel kinds** (section 2.3) and the six information classes (2.4).
- [ ] **The 25 register fields and the nine-field deal profile** (section 6).
- [ ] **The five questions** (section 7). The deck names "five questions a CEO or CFO cannot answer from the IT policy" for the client briefing; confirm whether these are the same five.
- [ ] **The non-egress ladder N0 to N6** (section 8.3), its base rule, and the boundary adjustments.
- [ ] **The five-part obtainability test** (8.4), carried over from the AI Use Assessment with T2 redefined as deal-scoped.
- [ ] **Finding types F4 and F5**, and reporting F5 per channel rather than once.
- [ ] **The gap priority matrix** (9.2) and the exposure consequence codes X1 to X4.
- [ ] **The ten-day plan, document list and interview list** (section 5).
- [ ] **The five-minute demonstration protocol** (5.4) and its place in the annex.
- [ ] **The two-day counsel turnaround** and the 12-to-25 channel default.

### 13.4 For counsel

- [ ] **Legal references.** ASX Listing Rule 3.1 and the Corporations Act are cited as the deck states them. This framework does not restate them; counsel confirms what appears in any deliverable.
- [ ] **Whether X1 to X4 stay on the technical side of the line.** They label information classes reachable, not legal consequence. Confirm the labels and wording.
- [ ] **Whether T3 stays on the technical side.** It records that a setting or term exists and what it says.
- [ ] **Adviser questions.** Confirm the route: through the deal team lead, or through DLC Legal.
- [ ] **Deal content rule.** Confirm the structural-only document requests in 5.2 are sufficient, and the code-name practice.
- [ ] **Document marking and circulation** under the privilege position.
- [ ] **Whether F5 may appear in the board paper annex as drafted**, given the deck's commitment that no product is presented.

### 13.5 Other open items

- [ ] **The independent checker.** "To be confirmed" in the deck. The two-week plan depends on who it is and when.
- [ ] **Whether the deal assessment is a mode of the AI Use Assessment app or a separate app.** Section 11 is written so either works. The recommendation in the opportunity note of 21 October was a separate, lighter app sharing components and file formats.
- [ ] **Fee.** A$12,500 to A$15,000 fixed per the deck. Confirm against the ten-day plan and the four-person team.
- [ ] **Recently closed deals.** The deck includes them. Confirm what changes: the window is past, so N4 record and N3 history matter more than N5 containment.
- [ ] **Post-engagement.** The residual gap's "control that reads meaning" is noted in the deck as designed, not yet built, targeted for December 2026. This framework does not depend on it.

### Sources

- DLC Legal planning deck: "Deal information and AI: where it can reach an external model, and what your client can prove", Damian Hickey, 21 October 2026, 29 slides.
- AI Use Assessment Framework, 11 October 2026, for structure, the obtainability test and the review points.
- Opportunity assessment note, this project, 21 October 2026.

No external source was consulted. Regulatory references are as stated in the deck.

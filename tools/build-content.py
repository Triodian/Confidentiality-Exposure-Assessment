#!/usr/bin/env python3
"""Builds public/cea-content.json and public/cea-content.js from this script and the framework in docs/specs.
Run from the repository root: python3 tools/build-content.py
The content file is the single place for the scales, field definitions, question set, glossary and phases that the
app reads. Changing a scale is a change here, not in the code."""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAMEWORK = os.path.join(ROOT, 'docs', 'specs', 'AI Confidentiality Exposure Assessment Framework.md')
MARK = os.path.join(ROOT, 'public', 'triodian-mark.svg')

framework_md = open(FRAMEWORK, encoding='utf-8').read()
mark_svg = open(MARK, encoding='utf-8').read().strip()

C = {
  'schema': 'triodian.cea.content.v1',
  'frameworkDate': '21 October 2026',
  'banner': 'A technical assessment prepared for counsel. It states what the documents show, how each channel is classified and what evidence can be produced. It gives no legal advice, names no product and holds no deal content.',

  'roles': [
    {'id': 'methodOwner', 'name': 'Method owner (Triodian)'},
    {'id': 'assessor', 'name': 'Assessor (Triodian)'},
    {'id': 'peer', 'name': 'Classification reviewer (Triodian)'},
    {'id': 'validation', 'name': 'Validation (Triodian)'},
    {'id': 'delivery', 'name': 'Delivery manager (Triodian)'},
    {'id': 'counsel', 'name': 'Counsel (DLC Legal)'},
    {'id': 'gc', 'name': 'GC or approving executive (company)'},
    {'id': 'dealLead', 'name': 'Deal team lead (company)'},
    {'id': 'tenantOwner', 'name': 'Tenant owner (company)'},
    {'id': 'checker', 'name': 'Independent checker'},
  ],

  'boundaries': [
    {'code': 'B1', 'name': "The company's own estate", 'controls': "The company's tenant owner and IT", 'can': 'Configure, direct, log'},
    {'code': 'B2', 'name': "An adviser's estate", 'controls': 'The bank, law firm, technical adviser or data-room provider', 'can': 'Require by letter or deed; obtain attestation or record'},
    {'code': 'B3', 'name': 'Personal estate', 'controls': 'A member of the deal team or insider list, on a personal account or device', 'can': 'Direct only; evidence is the direction and its acknowledgement'},
  ],

  'kinds': [
    {'code': 'K1', 'name': 'Sanctioned enterprise assistant with reach over stored content', 'boundary': 'B1', 'example': 'Microsoft 365 Copilot answering from any deal folder the user can open'},
    {'code': 'K2', 'name': 'Sanctioned AI tool that receives what a user submits', 'boundary': 'B1', 'example': 'An enterprise chatbot licence; AI features inside Office, email or the browser'},
    {'code': 'K3', 'name': 'Embedded AI in collaboration and meeting tools', 'boundary': 'B1', 'example': 'Meeting transcription and recap; AI notetakers invited to deal calls'},
    {'code': 'K4', 'name': 'Unsanctioned AI reached from a managed device', 'boundary': 'B1', 'example': 'A consumer chatbot opened in the browser on a company laptop'},
    {'code': 'K5', 'name': 'Personal device', 'boundary': 'B3', 'example': 'A chatbot on a phone, with a deal document photographed or a paragraph retyped'},
    {'code': 'K6', 'name': 'Data-room and document movement', 'boundary': 'B1 or B2', 'example': 'Exports, downloads, prints and forwards that land a document where a K1 to K5 channel can reach it'},
    {'code': 'K7', 'name': 'Adviser tooling', 'boundary': 'B2', 'example': "Each adviser's own AI tools, one entry per adviser"},
  ],

  'infoClasses': [
    {'code': 'I1', 'name': 'Existence of the deal and the counterparty', 'def': 'Code name resolved; a calendar entry; an adviser’s name'},
    {'code': 'I2', 'name': 'Process and timetable', 'def': 'Bid dates, exclusivity, conditions precedent'},
    {'code': 'I3', 'name': 'Price, terms and structure', 'def': 'Offer price, consideration, earn-outs'},
    {'code': 'I4', 'name': 'Valuation and synergy models', 'def': 'Assumptions, synergy lines, sensitivities'},
    {'code': 'I5', 'name': 'Due diligence findings', 'def': 'Technical, financial and legal findings about either party'},
    {'code': 'I6', 'name': 'Board papers and recommendations', 'def': 'The board’s position and the reasons for it'},
  ],

  'reaches': [
    {'code': 'R1', 'name': 'Typed and pasted text only', 'test': 'A person must type or paste; no file upload; no scope over storage', 'example': 'A chatbot with upload disabled'},
    {'code': 'R2', 'name': 'Documents a person chooses to submit', 'test': 'Upload or attach, one document at a time', 'example': 'A chatbot with upload; an AI feature inside a document editor'},
    {'code': 'R3', 'name': 'Stored content the user can open', 'test': 'The tool answers from folders, mailboxes and chats within the user’s permissions', 'example': 'An enterprise assistant with default scope over the tenant'},
    {'code': 'R4', 'name': 'Content it receives without a submission', 'test': 'Transcription, recording, automatic sync, data-room AI features', 'example': 'A meeting notetaker; a data room’s built-in summariser'},
  ],
  'reachTests': [
    'Can the channel answer from stored deal content without a person pasting it? (K1: yes if the assistant’s scope includes any deal folder the user can open.)',
    'Can a person put whole documents into it, rather than only typed and pasted text?',
    'Does it receive content without anyone deciding to submit it? (K3 transcription; K6 automatic sync.)',
  ],

  'exposures': [
    {'code': 'X1', 'name': 'Immaterial', 'def': 'Information class I1 only, already public or about to be'},
    {'code': 'X2', 'name': 'Deed and letter consequence', 'def': 'Classes I1 to I2 reachable; the counterparty’s deed is engaged'},
    {'code': 'X3', 'name': 'Process consequence', 'def': 'Classes I3 to I5 reachable; price, rival bid or process at stake'},
    {'code': 'X4', 'name': 'Disclosure and trading consequence', 'def': 'Classes I3 to I6 reachable by anyone outside the insider list'},
  ],

  'rungs': [
    {'code': 'N0', 'name': 'None', 'def': 'Nothing.', 'producedBy': 'n/a', 'closes': 'No'},
    {'code': 'N1', 'name': 'Direction', 'def': 'A written AI-use direction covering the channel, issued to the deal team and insider list, with acknowledgements and dates.', 'producedBy': 'DLC Legal drafts; deal team lead issues', 'closes': 'No'},
    {'code': 'N2', 'name': 'Attestation', 'def': 'A signed statement from the tool provider’s terms or from an adviser: what the tool retains, whether content trains any model, what the adviser’s tooling can reach, over the deal window.', 'producedBy': 'The provider’s terms; the adviser', 'closes': 'No'},
    {'code': 'N3', 'name': 'Configuration', 'def': 'A dated export of the settings in force: assistant scope, DLP rules, labels, barriers, web filter, device policy, with change history for the deal window.', 'producedBy': 'The tenant owner', 'closes': 'No'},
    {'code': 'N4', 'name': 'Record', 'def': 'A retrievable log of what crossed the channel in the deal window: submissions, uploads, exports, transcriptions, with who and when, capturing enough to answer “what left”.', 'producedBy': 'The tenant owner; the data-room provider; the adviser', 'closes': 'Partly: shows what left, after the fact'},
    {'code': 'N5', 'name': 'Containment', 'def': 'Evidence that the channel cannot reach deal content at all for the deal window: assistant scope excluding the deal folders, barriers between the deal team and the rest, uploads disabled, data-room AI features off.', 'producedBy': 'The tenant owner; the data-room provider', 'closes': 'For R3 and R4 reach only'},
    {'code': 'N6', 'name': 'Meaning control', 'def': 'A control at the boundary that reads the meaning of outbound text against the deal’s sensitive content, independent of the AI, with a signed record per submission of what was requested, what applied and what was allowed.', 'producedBy': 'A control not yet deployed in the company’s estate', 'closes': 'Yes'},
  ],
  'baseRule': {'R1': 'N4', 'R2': 'N4', 'R3': 'N5', 'R4': 'N5'},

  'tests': [
    {'id': 'T1', 'name': 'Produced', 'q': 'Does a record, export or statement of this type exist, or could it be produced from what is already in place without new tooling?', 'source': 'D5 to D9, interviews'},
    {'id': 'T2', 'name': 'Deal-scoped', 'q': 'Can it be produced for this deal window and this deal team without exposing deal content or individuals’ personal data beyond what the question needs?', 'source': 'Nature of the record'},
    {'id': 'T3', 'name': 'Reachable', 'q': 'Is there a route for the company to obtain it: it holds the setting, or a term in a letter or deed gives it, or a contracting point exists where one could be added?', 'source': 'Fields 10, 13'},
    {'id': 'T4', 'name': 'Checkable', 'q': 'Can someone independent of the party producing it verify it?', 'source': 'Field 20'},
    {'id': 'T5', 'name': 'Timely', 'q': 'Can it be produced within the time the company would need to act on it and meet any notification obligation counsel identifies?', 'source': 'Retention periods, retrieval route'},
  ],

  'findings': [
    {'code': 'F1', 'name': 'Shown', 'cond': 'Obtainable rung is at or above the required rung'},
    {'code': 'F2', 'name': 'Gap, closable from what exists', 'cond': 'Obtainable rung is below the required rung, and the route to close it is configuration, contract or direction'},
    {'code': 'F3', 'name': 'No reasonable reach', 'cond': 'Counsel determines the company cannot reasonably require evidence over this channel'},
    {'code': 'F4', 'name': 'Not determinable on documents', 'cond': 'The documents do not show what the channel retains or reaches'},
    {'code': 'F5', 'name': 'Residual gap, meaning', 'cond': 'The channel accepts typed or pasted text, and no deployed control reads meaning. Recorded beside F1 or F2, never instead of them'},
  ],
  'matrix': {'g1': {'X1': 'Low', 'X2': 'Low', 'X3': 'Medium', 'X4': 'Medium'}, 'g2': {'X1': 'Low', 'X2': 'Medium', 'X3': 'High', 'X4': 'High'}, 'g3': {'X1': 'Medium', 'X2': 'High', 'X3': 'High', 'X4': 'High'}},
  'routes': {
    'T1:B1': {'route': 'Configuration', 'owner': 'Tenant owner', 'step': 'Restrict assistant scope over the deal folders; apply barriers; enable retrievable logging; disable AI features on the data room'},
    'T1:B2': {'route': 'Contract', 'owner': 'DLC Legal, through the GC', 'step': 'Attestation and record terms in the adviser letter at the next amendment, with the register beside the clauses'},
    'T1:B3': {'route': 'Direction', 'owner': 'Deal team lead, with DLC Legal’s text', 'step': 'Issue the AI-use direction; collect acknowledgements; add it to the insider list process'},
    'T2': {'route': 'Configuration', 'owner': 'Tenant owner', 'step': 'Scope logs and exports to the deal team and window'},
    'T3': {'route': 'Contract', 'owner': 'DLC Legal', 'step': 'Clause in the letter or deed; or the finding records that no contracting point falls within 90 days'},
    'T4': {'route': 'Process', 'owner': 'GC', 'step': 'Nominate who verifies the export or attestation; keep the dated copy'},
    'T5': {'route': 'Process', 'owner': 'Tenant owner; data-room administrator', 'step': 'Confirm retention covers the window; agree retrieval time'},
    'F5': {'route': 'Separate decision', 'owner': 'The company', 'step': 'A control that reads meaning at the boundary. Not part of this plan'},
  },

  'questions5': [
    {'n': 1, 'q': 'Who can reach this channel, and with what deal information?', 'scale': 'Reach R1 to R4; information class I1 to I6', 'by': 'Triodian classifies; deal team lead confirms', 'facts': 'Who uses it, how information enters, scope over folders', 'fields': '4, 8, 15, 16'},
    {'n': 2, 'q': 'What governs the channel: whose terms, whose settings, whose direction?', 'scale': 'Own estate · adviser’s estate under letter or deed · personal, direction only', 'by': 'Triodian records; counsel determines what the terms mean', 'facts': 'Verbatim terms, settings in force, direction given', 'fields': '9, 10, 12, 13'},
    {'n': 3, 'q': 'What record does the channel leave, and who can retrieve it?', 'scale': 'None · tool-side only · company-retrievable · adviser-retrievable', 'by': 'Triodian', 'facts': 'What is logged, retention period, retrieval route', 'fields': '11, 19, 20'},
    {'n': 4, 'q': 'What can the company require over this channel?', 'scale': 'For B1: anything it configures. For B2: what the letter or deed gives. For B3: direction and acknowledgement', 'by': 'Counsel', 'facts': 'Field 13 extracts; next contracting point for each adviser', 'fields': '13, 23, 24'},
    {'n': 5, 'q': 'What evidence can be shown that the information did not leave, or of what left and when?', 'scale': 'N0 to N6', 'by': 'Counsel determines the required rung; Triodian tests obtainability', 'facts': 'Indicative rung, evidence held, evidence producible, checkability', 'fields': '17 to 22, 24'},
  ],
  'b2Prompts': [
    'Does the letter reach the adviser’s sub-advisers and platforms?',
    'Can an attestation be required, and in what form?',
    'Do the deed’s obligations on the company extend to what its advisers do?',
  ],

  'fields': [
    {'n': 1, 'name': 'Channel ID', 'format': 'CH-01 onward', 'kind': 'auto', 'tab': 'facts'},
    {'n': 2, 'name': 'Channel kind', 'format': 'K1 to K7', 'kind': 'kind', 'tab': 'facts'},
    {'n': 3, 'name': 'Boundary', 'format': 'B1, B2, B3', 'kind': 'select:B1|B2|B3', 'tab': 'facts'},
    {'n': 4, 'name': 'Who uses it', 'format': 'Deal team · insider list · adviser · everyone with folder access', 'kind': 'select:dealTeam|insiders|adviser|everyone', 'tab': 'facts'},
    {'n': 5, 'name': 'Tool or service', 'format': 'Name and licence tier, or “any consumer tool” for K4 and K5', 'kind': 'text', 'tab': 'facts'},
    {'n': 6, 'name': 'Provider and model behind it', 'format': 'Legal entity names, or not known', 'kind': 'text', 'tab': 'facts'},
    {'n': 7, 'name': 'Location of processing and retention', 'format': 'Country, or not known', 'kind': 'text', 'tab': 'facts'},
    {'n': 8, 'name': 'How information enters the channel', 'format': 'Scope over stored content · paste or type · upload · transcription · export then re-entry', 'kind': 'select:scope|paste|upload|transcription|export', 'tab': 'facts'},
    {'n': 9, 'name': 'Terms on retention, training, logging and human review', 'format': 'Clause references with verbatim extracts, or “consumer terms” or not known', 'kind': 'area', 'tab': 'facts'},
    {'n': 10, 'name': 'Settings in force today', 'format': 'From D5, D7, D8: the specific setting, its value, and the export date', 'kind': 'area', 'tab': 'facts'},
    {'n': 11, 'name': 'Records the channel leaves', 'format': 'What is logged, where, for how long, who can retrieve it', 'kind': 'area', 'tab': 'facts'},
    {'n': 12, 'name': 'Direction given to users of this channel', 'format': 'The AI-use direction or policy text that covers it, or “none”', 'kind': 'area', 'tab': 'facts'},
    {'n': 13, 'name': 'Terms the company holds over the channel’s owner', 'format': 'B2: the letter or deed clauses on information handling, AI and attestation, verbatim. B1: own estate. B3: direction only', 'kind': 'area', 'tab': 'facts'},
    {'n': 14, 'name': 'Sanctioned status', 'format': 'Sanctioned · tolerated · banned · banned, use moved to K5', 'kind': 'select:sanctioned|tolerated|banned|movedK5', 'tab': 'facts'},
    {'n': 15, 'name': 'Reach', 'format': 'R1 to R4 (section 8.1)', 'kind': 'classify', 'tab': 'classify'},
    {'n': 16, 'name': 'Information class reachable', 'format': 'I1 to I6, the highest', 'kind': 'classify', 'tab': 'classify'},
    {'n': 17, 'name': 'Indicative rung', 'format': 'N0 to N6, by rule (section 8.3)', 'kind': 'auto', 'tab': 'classify'},
    {'n': 18, 'name': 'Evidence the company holds today', 'format': 'Rung and description, or none', 'kind': 'rung', 'tab': 'evidence'},
    {'n': 19, 'name': 'Evidence the channel could produce', 'format': 'The record or export and where it would be generated', 'kind': 'area', 'tab': 'evidence'},
    {'n': 20, 'name': 'Independently checkable', 'format': 'Yes · no · partly, with reason', 'kind': 'select:yes|no|partly', 'tab': 'evidence'},
    {'n': 21, 'name': 'Obtainable rung', 'format': 'N0 to N6, by test (section 8.4)', 'kind': 'auto', 'tab': 'evidence'},
    {'n': 22, 'name': 'Confidence in obtainability', 'format': 'High · medium · low', 'kind': 'auto', 'tab': 'evidence'},
    {'n': 23, 'name': 'Rights determination', 'format': 'Counsel’s wording on what the company can require over this channel, with question reference', 'kind': 'counsel', 'tab': 'counsel'},
    {'n': 24, 'name': 'Required rung', 'format': 'N0 to N6, set by counsel', 'kind': 'counsel', 'tab': 'counsel'},
    {'n': 25, 'name': 'Finding, closing route and owner', 'format': 'F1 to F5, route (section 9.3), named owner', 'kind': 'auto', 'tab': 'finding'},
  ],
  'optLabels': {
    'dealTeam': 'Deal team', 'insiders': 'Insider list', 'adviser': 'Adviser', 'everyone': 'Everyone with folder access',
    'scope': 'Scope over stored content', 'paste': 'Paste or type', 'upload': 'Upload', 'transcription': 'Transcription', 'export': 'Export then re-entry',
    'sanctioned': 'Sanctioned', 'tolerated': 'Tolerated', 'banned': 'Banned', 'movedK5': 'Banned, use moved to K5',
    'yes': 'Yes', 'no': 'No', 'partly': 'Partly', 'B1': 'B1', 'B2': 'B2', 'B3': 'B3',
  },

  'profile': [
    {'id': 'codeName', 'name': 'Deal code name', 'format': 'As chosen by counsel. The only name the assessment uses', 'kind': 'text'},
    {'id': 'stage', 'name': 'Deal stage', 'format': 'Pre-approach · in diligence · signed, pre-completion · completed within 90 days', 'kind': 'select:preApproach|diligence|signed|completed'},
    {'id': 'teamCounts', 'name': 'Deal team size and insider list size', 'format': 'Counts by role, no names', 'kind': 'text'},
    {'id': 'folders', 'name': 'Deal folders', 'format': 'Location and folder name, with sharing scope and document count', 'kind': 'list'},
    {'id': 'advisers', 'name': 'Advisers', 'format': 'Firm type and role for each: bank, law, technical, accounting, data-room provider', 'kind': 'list'},
    {'id': 'tools', 'name': 'Sanctioned AI tools', 'format': 'Each tool, licence tier, and whether its scope reaches the deal folders', 'kind': 'list'},
    {'id': 'devicePolicy', 'name': 'Device policy', 'format': 'Managed only · managed plus BYOD · unmanaged permitted', 'kind': 'select:managed|byod|unmanaged'},
    {'id': 'privilegeMarking', 'name': 'Privilege marking', 'format': 'As DLC Legal instructs', 'kind': 'text'},
    {'id': 'counselTurnaround', 'name': 'Counsel turnaround', 'format': 'Working days agreed for questions', 'kind': 'number'},
  ],
  'stageLabels': {'preApproach': 'Pre-approach', 'diligence': 'In diligence', 'signed': 'Signed, pre-completion', 'completed': 'Completed within 90 days'},
  'deviceLabels': {'managed': 'Managed only', 'byod': 'Managed plus BYOD', 'unmanaged': 'Unmanaged permitted'},
  'adviserTypes': ['Bank', 'Law firm', 'Technical adviser', 'Accounting', 'Data-room provider', 'Other'],

  'documents': [
    {'ref': 'D1', 'name': 'Deal team and insider list, by role and count (names only if counsel permits)', 'usedFor': 'Deal profile; B3 channels'},
    {'ref': 'D2', 'name': 'Deal folder structure: locations, folder names, sharing settings, document counts. No documents', 'usedFor': 'K1 reach; K6 paths'},
    {'ref': 'D3', 'name': 'Adviser list with each engagement letter and any side letter', 'usedFor': 'K7 entries; what each letter requires on information handling and AI'},
    {'ref': 'D4', 'name': 'The confidentiality deed and any counterparty protocol', 'usedFor': 'What the company has undertaken; what it must show'},
    {'ref': 'D5', 'name': 'Tenant configuration summary exported by the tenant owner: assistant scope and policy, DLP rules, labels, barriers, web filter, retention', 'usedFor': 'K1 to K4 settings; N3 evidence'},
    {'ref': 'D6', 'name': 'Licence terms and data-handling documentation for each sanctioned AI tool', 'usedFor': 'K2, K3 terms: retention, training, logging, residency'},
    {'ref': 'D7', 'name': 'Data-room provider terms, AI feature settings, export and watermark settings, access and export log availability', 'usedFor': 'K6 entries'},
    {'ref': 'D8', 'name': 'Device policy: managed devices, BYOD, mobile device management, app controls', 'usedFor': 'K4, K5'},
    {'ref': 'D9', 'name': 'AI acceptable-use policy and any AI-use direction already issued for the deal', 'usedFor': 'N1 evidence; what staff have been told'},
    {'ref': 'D10', 'name': 'Existing assurance over the above: internal audit, security certifications, prior DLP reviews', 'usedFor': 'What existing assurance already covers'},
  ],
  'interviews': [
    {'who': 'GC, or the executive who approved the brief', 'purpose': 'Confirm the profile and the privilege handling. Hear what the company believes it could show today', 'length': '30 min'},
    {'who': 'Deal team lead, CFO’s office', 'purpose': 'How the team works: tools in daily use, late-night habits, what is pasted where, what has been told to the team', 'length': '45 min'},
    {'who': 'Tenant owner or head of IT security', 'purpose': 'Walk through D5. What each setting reaches and does not. What logs exist and for how long', 'length': '60 min'},
    {'who': 'Data-room administrator', 'purpose': 'Export paths, AI features in the room, what the room logs', 'length': '30 min'},
    {'who': 'Each adviser’s relationship lead, through the company', 'purpose': 'What their tooling can reach, what their firm policy says, what they can attest in writing', 'length': '20 min each'},
  ],

  'reviews': [
    {'id': 'R1', 'name': 'Profile review', 'when': 'End of phase 1', 'reviewer': 'DLC Legal and GC', 'tests': 'Profile agreed; every channel kind listed for consideration'},
    {'id': 'R2', 'name': 'Register completeness', 'when': 'End of phase 2', 'reviewer': 'Delivery manager', 'tests': 'Fields 1 to 14 complete or not known; every value sourced and dated; no deal content in any field'},
    {'id': 'R3', 'name': 'Classification review', 'when': 'During phase 3', 'reviewer': 'A second Triodian reviewer, not the classifier', 'tests': 'Reach re-derived from field 8 without sight of the original; differences resolved and logged'},
    {'id': 'R4', 'name': 'Validation', 'when': 'End of phase 3', 'reviewer': 'Validation', 'tests': 'Rules in 8.3 and 8.4 applied consistently; every adjustment has a reason; every obtainable rung has five test results'},
    {'id': 'R5', 'name': 'Legal-line and content check', 'when': 'Before any draft leaves Triodian', 'reviewer': 'Method owner', 'tests': 'No sentence states what the law requires; no deal content; “required”, “gap” and “residual gap” used only as 10.4 allows; no product named'},
    {'id': 'R6', 'name': 'Counsel review', 'when': 'Phase 5', 'reviewer': 'DLC Legal', 'tests': 'Draft seen by counsel first; determinations transcribed accurately'},
    {'id': 'R7', 'name': 'Check', 'when': 'Phase 6', 'reviewer': 'Independent checker, or validation if none is confirmed', 'tests': 'Is the assessment sound, and are its findings supported?'},
  ],
  'phases': [
    {'n': 0, 'name': 'Mobilise', 'days': 'Before day 1', 'screenName': 'Set-up', 'screen': 'setup'},
    {'n': 1, 'name': 'Deal profile', 'days': 'Days 1 to 2', 'screenName': 'Profile', 'screen': 'profile'},
    {'n': 2, 'name': 'Register the channels', 'days': 'Days 2 to 5', 'screenName': 'Register', 'screen': 'register'},
    {'n': 3, 'name': 'Classify and test', 'days': 'Days 5 to 8', 'screenName': 'Classify', 'screen': 'classify'},
    {'n': 4, 'name': 'Questions to counsel', 'days': 'Days 5 to 9', 'screenName': 'Counsel', 'screen': 'counsel'},
    {'n': 5, 'name': 'Findings and plan', 'days': 'Days 8 to 10', 'screenName': 'Findings', 'screen': 'findings'},
    {'n': 6, 'name': 'Check', 'days': 'Day 10 or the following week', 'screenName': 'Review', 'screen': 'review'},
    {'n': 7, 'name': 'Close', 'days': 'After the check', 'screenName': 'Outputs', 'screen': 'outputs'},
  ],
  'annexOutline': [
    'Purpose, and the question the assessment answers',
    'What was and was not done: no deal content, no system access, no logs read, no vendor or adviser system examined, no forensics, no legal advice',
    'The deal profile, by code name, and the channel kinds covered',
    'Method: register, five questions, ladder, obtainability test',
    'The five-minute demonstration: whether performed, on what text, which controls passed',
    'Summary table of findings',
    'Finding by channel',
    'The 90-day plan, by owner',
    'The residual gap: extent, classes reached, class of control, horizon',
    'Patterns: which test fails most, and at which boundary',
    'Limitations and confidence, including the not-known count',
    'Appendices: register extract, question log, source index, exceptions log',
  ],
  'legalPhrases': ['must comply', 'is required by', 'breach of', 'non-compliant', 'in breach', 'legally required', 'obliged to', 'price-sensitive', 'was breached', 'carve-out was lost', 'insider trading'],
  'productPhrases': ['Pinpole', 'Copilot', 'ChatGPT', 'Gemini', 'Claude', 'Purview', 'Semantic Enforcement'],
  'contentPatterns': [
    {'id': 'money', 'label': 'a money amount', 're': '(?:\\$|A\\$|US\\$|£|€)\\s?\\d[\\d,]*(?:\\.\\d+)?\\s?(?:m|bn|k|million|billion)?'},
    {'id': 'bigNumber', 'label': 'a figure in millions or billions', 're': '\\b\\d[\\d,.]*\\s?(?:million|billion|m|bn)\\b'},
    {'id': 'percent', 'label': 'a percentage', 're': '\\b\\d{1,3}(?:\\.\\d+)?\\s?%'},
    {'id': 'perShare', 'label': 'a per-share figure', 're': '\\bper share\\b'},
    {'id': 'counterparty', 'label': 'a party named as counterparty, target or bidder', 're': '\\b(?:counterparty|target|bidder|acquirer)\\s*[:=]'},
  ],

  'deliverables': [
    {'id': 'CD1', 'name': 'Channel register', 'contents': 'All 25 fields for every channel. Source index. Count of not-known fields by kind', 'accepted': 'Every channel kind considered; every entry has a finding or is recorded F4; no field blank'},
    {'id': 'CD2', 'name': 'Finding per channel', 'contents': 'One worksheet per channel (section 9.4). A one-page summary table: channel, kind, boundary, reach, class, indicative, required, obtainable, finding, priority, F5 flag', 'accepted': 'Each worksheet reviewed; each rung traceable to a test result'},
    {'id': 'CD3', 'name': '90-day plan from what exists', 'contents': 'Every F2 step by owner and week, with the setting, clause or direction it uses, and what evidence it will produce when done', 'accepted': 'Each step names an owner who holds the setting, the letter or the team'},
    {'id': 'CD4', 'name': 'The residual gap, marked', 'contents': 'The channels carrying F5, the information classes they reach, the class of control that would close it, the earliest horizon, and what the company would be able to show once it existed. No product named', 'accepted': 'DLC Legal confirms the language rules in 10.4 are met'},
    {'id': 'CD5', 'name': 'Technical annex, in Triodian’s name', 'contents': 'Method, deal profile (code name only), summary table, findings, the demonstration record, limitations, not-known count, statement of what was not done', 'accepted': 'Validation complete; the check complete and its points closed or disclosed'},
  ],
  'worksheetParts': [
    ['A', 'Identification', 'Channel ID, kind, boundary, worksheet version, preparer, reviewer'],
    ['B', 'Path', 'How deal information reaches the channel, from folder to model, with the parties on the way'],
    ['C', 'Facts', 'Register fields 4 to 14, each with its source reference'],
    ['D', 'Classification', 'Reach and information class, each with a two-line rationale tied to part C'],
    ['E', 'Ladder', 'Indicative rung, any adjustment and reason, evidence held today'],
    ['F', 'Obtainability', 'Result of T1 to T5 at each rung tested, the obtainable rung and confidence'],
    ['G', 'Questions to counsel', 'Each question, date sent, response, date received'],
    ['H', 'Counsel’s determinations', 'Fields 23 and 24, transcribed with question references'],
    ['I', 'Finding', 'Type, gap size and priority, failed test, route, owner, 90-day step; F5 beside it if it applies'],
    ['J', 'Not known', 'Every field recorded as not known, and what would resolve it'],
  ],

  'glossary': {
    'channel': {'term': 'Channel', 'def': 'One path by which deal information can reach an external AI model: a sanctioned tool and its terms, a personal account or device, an enterprise assistant’s reach over the deal folders, a data-room export path, or one adviser’s tooling. The unit of assessment.', 'where': 'Register'},
    'kind': {'term': 'Channel kind', 'def': 'One of seven fixed kinds, K1 to K7, so registers from different deals can be compared. A ban on a tool does not remove a channel; it usually moves a K2 or K4 channel to K5.', 'where': 'Register'},
    'boundary': {'term': 'Boundary', 'def': 'Whose estate the channel sits in: the company’s own (B1), an adviser’s (B2) or a person’s (B3). The boundary decides what the company can do: configure, require by letter, or direct.', 'where': 'Register'},
    'infoClass': {'term': 'Information class', 'def': 'The highest class of deal information the channel can reach, I1 (the deal exists) to I6 (board papers). Descriptive only; counsel determines its legal character.', 'where': 'Classify'},
    'reach': {'term': 'Reach', 'def': 'How deal information can enter the channel: typed text only (R1), documents a person submits (R2), stored content the user can open (R3), or content it receives without a submission (R4). Three yes-or-no tests derive it.', 'where': 'Classify'},
    'exposure': {'term': 'Exposure consequence', 'def': 'A technical label, X1 to X4, for the information the channel can reach, used only to rate a gap’s priority. Whether any disclosure or trading provision is engaged is counsel’s determination.', 'where': 'Findings'},
    'rung': {'term': 'Non-egress evidence ladder', 'def': 'A scale, N0 to N6, of what the company could show about a channel: nothing, a direction, an attestation, a configuration export, a record, containment, or a control that reads meaning.', 'where': 'Classify, Reference'},
    'indicative': {'term': 'Indicative rung', 'def': 'The evidence type that corresponds to what the channel can reach, set by rule: N4 for R1 and R2, N5 for R3 and R4, capped at N4 in an adviser’s estate and N1 on a personal device. A technical starting point; which rung applies is for the company and counsel.', 'where': 'Classify'},
    'required': {'term': 'Required rung', 'def': 'The evidence the company can reasonably require for this channel, given its rights over it. Set by counsel, never by Triodian.', 'where': 'Counsel'},
    'obtainable': {'term': 'Obtainable rung', 'def': 'The highest evidence type that can in fact be produced for the deal window and independently checked. Found by testing each rung from the indicative one down until one passes all five tests.', 'where': 'Classify'},
    'obtest': {'term': 'Obtainability test', 'def': 'Five conditions a rung must pass: produced (T1), deal-scoped (T2), reachable (T3), checkable (T4), timely (T5).', 'where': 'Classify'},
    'confidence': {'term': 'Confidence', 'def': 'High where the export, log sample or attestation has been seen; medium where the documentation describes it; low where the rung is inferred from the type of tool. Low by default in an adviser’s estate.', 'where': 'Classify'},
    'finding': {'term': 'Finding', 'def': 'One per channel after counsel has set the required rung: shown (F1), gap closable from what exists (F2), no reasonable reach (F3), not determinable on documents (F4). F5 is recorded beside F1 or F2.', 'where': 'Findings'},
    'F5': {'term': 'Residual gap', 'def': 'Every channel that accepts typed or pasted text has the same gap: a paraphrase of a deal paragraph passes every control the company owns, because those controls check files, patterns and destinations and none reads meaning. Named on every channel where it exists; the decision is the company’s. No product is named.', 'where': 'Findings'},
    'F4': {'term': 'Not determinable on documents', 'def': 'The documents do not show what a tool retains, what an adviser’s tooling can reach, or what a setting is. Recorded with the specific question that would resolve it and who could answer it.', 'where': 'Register'},
    'gap': {'term': 'Gap', 'def': 'The required rung minus the obtainable rung, in rungs. Used only where counsel has set a required rung above the obtainable one. Priority combines gap size with exposure consequence.', 'where': 'Findings'},
    'plan': {'term': '90-day plan', 'def': 'Every F2 step by owner and week, ordered by priority, using only configuration, contract or direction the company already has. Who closes F5, and with what, is a separate decision.', 'where': 'Outputs'},
    'profile': {'term': 'Deal profile', 'def': 'Nine items recorded once: code name, stage, team and insider counts, deal folders, advisers, sanctioned tools, device policy, privilege marking and counsel turnaround. Set by counsel and the GC.', 'where': 'Profile'},
    'codeName': {'term': 'Code name', 'def': 'The only name the assessment uses for the deal. Chosen by counsel. No counterparty name, price or figure appears anywhere.', 'where': 'Profile'},
    'dealContent': {'term': 'Deal content', 'def': 'A deal document, a paragraph from one, a price, a counterparty name or a valuation figure. None enters the assessment. A reviewer who finds any in a field records an exception and the field is cleared.', 'where': 'Register, Review'},
    'notKnown': {'term': 'Not known', 'def': 'A valid entry for any field whose value the documents do not show. Never estimated. Counted and reported by channel kind in the annex.', 'where': 'Register'},
    'source': {'term': 'Source reference', 'def': 'Document and page, or interview and date, for every value. A value without a source is recorded as not known.', 'where': 'Register'},
    'qc': {'term': 'Question to counsel', 'def': 'Any point that needs a legal view, logged as a numbered written question (QC-01 onward) with the facts, the question, why it matters and counsel’s unedited response. Never answered in a working paper.', 'where': 'Counsel'},
    'blind': {'term': 'Blind re-derivation', 'def': 'The classification review (R3): a second Triodian reviewer re-derives the reach from field 8 without seeing the classifier’s reach. Both positions and the resolution stay on the worksheet.', 'where': 'Classify'},
    'demo': {'term': 'Five-minute demonstration', 'def': 'A redacted paragraph is paraphrased as an analyst would and run past the company’s controls. Not an evidence item; the annex records whether it was performed, on what text and which controls passed the paraphrase.', 'where': 'Review'},
    'privilege': {'term': 'Privilege marking', 'def': 'The marking DLC Legal directs, printed as the first line of every output. Storage and circulation follow counsel’s instruction.', 'where': 'Profile, Outputs'},
    'legalline': {'term': 'Legal-line check', 'def': 'R5: every draft output is scanned for wording that states what the law requires, names a product, or holds deal content. Each hit is cleared by the method owner before any output is final.', 'where': 'Review'},
    'checker': {'term': 'Independent checker', 'def': 'Checks Triodian’s assessment and reports to DLC Legal, receiving the pack from counsel, not from Triodian. If none is confirmed, validation stands as R7.', 'where': 'Set-up, Review'},
    'roleLimits': {'term': 'Why a control is disabled', 'def': 'Every change is allowed by role and by who did what: a reviewer cannot review their own classification, validation must have classified nothing, counsel’s determinations are transcribed not decided. The server applies the same rules to every save.', 'where': 'Everywhere'},
    'transcribed': {'term': 'Transcribed', 'def': 'Counsel’s written response pasted word for word by a Triodian role, with the question number. Fields 23 and 24 are never completed by Triodian in its own words.', 'where': 'Counsel'},
    'window': {'term': 'Deal window', 'def': 'The period from the first confidential step to completion or 90 days after. Evidence is produced for this window and this deal team.', 'where': 'Profile'},
    'moved': {'term': 'Moved to K5', 'def': 'A banned K2 or K4 channel stays on the register with its status, and a K5 entry is added for where the use goes.', 'where': 'Register'},
    'absent': {'term': 'Considered, absent', 'def': 'A channel the company says does not exist is still entered, with the reason, so the register shows it was considered.', 'where': 'Register'},
    'five': {'term': 'The five questions', 'def': 'Worked in order for every channel: who can reach it, what governs it, what record it leaves, what the company can require, and what evidence can be shown. Two sit under all of them: what can be required, and what can actually be shown.', 'where': 'Reference'},
    'adviser': {'term': 'Adviser', 'def': 'A bank, law firm, technical adviser, accounting firm or data-room provider engaged on the deal. Each has one K7 entry. Questions to an adviser go through the deal team lead or DLC Legal, never from Triodian.', 'where': 'Profile'},
  },

  'frameworkMarkdown': framework_md,
  'markSvg': mark_svg,
}

out_json = os.path.join(ROOT, 'public', 'cea-content.json')
out_js = os.path.join(ROOT, 'public', 'cea-content.js')
with open(out_json, 'w', encoding='utf-8') as f:
    json.dump(C, f, ensure_ascii=False, indent=1)
    f.write('\n')
with open(out_js, 'w', encoding='utf-8') as f:
    f.write('/* Generated from cea-content.json by tools/build-content.py so the app runs from a local file. */\nwindow.CEA_CONTENT = ' + json.dumps(C, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('wrote', out_json, out_js, len(C['glossary']), 'glossary terms')

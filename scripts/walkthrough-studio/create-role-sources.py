"""Editable role-specific narration/storyboard sources. No production fixtures are touched."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2]
intro="Open your school's branded link. Staff and parents use their registered phone and four-digit PIN. This recording uses fictional demo records and a local session, not live authentication."
install="Open your school's link and choose Install school app. The real help dialog explains Safari and Chrome steps. A native installation is not being verified here."
offline="Sign in online and open needed records before offline work. Attendance and score drafts can sync when reconnected; review conflicts. Payments, messages and new sign-ins need internet. This demo does not verify live sync."
roles={
'exam_officer':('Exam Officer',[
('School link & sign-in',intro,'signin'),
('Find and filter exam papers','Open the menu and choose Exam Questions. Review the missing-paper tracker and filter by term, class or paper status. Check the submitted teacher paper before approving it.','exam-list'),
('Review → approve → A4 paper','Open the submitted paper preview and check its questions. Close the preview, then approve the demo paper. The paper and confidential marking scheme have separate PDF and Word controls.','exam-review'),
('All-class broadsheets & reports','Choose Results and Report Cards, then Class Broadsheet and Report Cards. Select the class and term. Open a learner report to inspect the actual fixed A four page before printing.','reports'),
('Install school app',install,'install'),
('Offline guidance & privacy',offline+' Keep marking schemes private and publish results only after the school review.','offline'),
]),
'class_teacher':('Class Teacher / Mu’allim',[
('School link & sign-in',intro,'signin'),
('Assigned-class attendance','Open Attendance and check your assigned class and date. Mark the demo class present, then inspect the attendance summary. Change only the learners you are responsible for.','attendance'),
('One account: class & subjects','Choose Results and Report Cards. The Subject Marksheet holds C A and exam scores. Your class and subject assignments stay in one account; this build uses the real menu labels shown here.','scores'),
('Class broadsheet → A4 report','Open Class Broadsheet and Report Cards. Inspect the subject totals, then open a report card. The same A four page scales down on a phone without rearranging the document.','reports'),
('Optional Tahfeez / Halqah variant','This next demo uses an enabled Quran programme. Open Quran Progress for Surah, Ayah and revision fields. If your school uses Mumtaz or Jayyid, confirm how those ratings map to this build. Conventional schools leave this module off.','quran'),
('Install school app',install,'install'),
('Offline drafts & reconnect',offline,'offline'),
]),
'subject_teacher':('Subject Teacher',[
('School link & sign-in',intro,'signin'),
('Assigned subject → score entry','Choose Results and Report Cards. Check the session, term, class and subject before entering scores. We change one fictional learner score here; your real account remains limited to its assignments.','scores'),
('Combined teaching group','Use Recording Mode to select your assigned combined group. Learners retain their home classes, so scores entered once can feed their class results. Inspect the actual A four marksheet preview.','combined'),
('Exam paper drafting & submission','Choose Exam Questions and open the demo draft. Review the question and its options before submission. The Exam Officer handles approval; a subject teacher does not gain all-school reporting permissions.','exam-draft'),
('Install school app',install,'install'),
('Offline scores & reconnect',offline+' Keep any unsynced work on your own device.','offline'),
]),
'bursar':('Bursar / Accountant',[
('School link & sign-in',intro,'signin'),
('Student balances & debtors','Choose Fees and Receipts. Review Student Balances and Debtors, then filter owing accounts. Confirm actual bank transfers before issuing official receipts; the figures here are fictional.','fees'),
('Official receipt → A4 preview','Open Receipts History and inspect the demo receipt. Use the receipt preview to check the details before printing on A four paper. Review the learner, amount and receipt number before printing.','receipts'),
('Monthly payroll & payslips','Open Staff and Payroll. Select the month and review the salary rows. Open the demo payslip to check additions, deductions and net salary before payment.','payroll'),
('Teaching & non-teaching staff','Open Staff and Role Assignments and filter non-teaching staff. Nannies, security, cleaners, drivers and cooks belong on payroll without unnecessary teaching logins.','staff'),
('Install school app',install,'install'),
('Online payments & sync limits',offline+' A locally shown balance is not bank verification.','offline'),
]),
'secretary':('School Secretary',[
('School link & sign-in',intro,'signin'),
('Admissions & guardian links','Choose Students, search the demo roster and open a learner record. Review the admission details and guardian phone. Link siblings carefully; never give one family access to another learner.','students'),
('Attendance & authorised classes','Choose Attendance and check the class and date. Review the summary and open the attendance sheet preview. The secretary uses authorised records, not owner settings or teacher score editing.','attendance-print'),
('Read-only A4 report printing','Return to Students and open a report card. Check the same fixed A four page on either device. Print only reports your role is allowed to access and follow the school publication process.','student-report'),
('School app guidance',install,'install'),
('Offline boundaries & privacy',offline+' Keep school links and family records private.','offline'),
]),
'parent':('Parent / Guardian',[
('School link & parent sign-in',intro,'signin'),
('Linked children & attendance','The Parent Portal shows only your linked children. Select a sibling and review the chosen term and attendance. These demo children are fictional; another family is excluded from this view.','siblings'),
('Published result → A4 report','Select Print Report Card for a published result. Inspect the actual fixed A four page before printing or saving to PDF. Parents do not enter scores or see unpublished results.','parent-report'),
('Fees, receipts & transfer safety','Scroll to the child fee summary and official receipts. Inspect the demo receipt. Confirm payment instructions with the school; a transfer notice is not proof that money was received.','parent-fees'),
('Install your school app',install,'install'),
('Safe offline viewing','Sign in online first and open the records you need on your own device. Offline copies may be out of date until reconnection. New sign-ins, payments and messages need internet. Keep your PIN private; live sync is not being verified here.','offline'),
])}
for role,(title,rows) in roles.items():
 scenes=[{'id':f'{i:02}','label':label,'instruction':label,'narration':text,'action':action} for i,(label,text,action) in enumerate(rows,1)]
 text='\n\n'.join(s['narration'] for s in scenes)
 assert len(text)<=1500,(role,len(text))
 out=ROOT/'docs/walkthroughs/v6-roles'/role;out.mkdir(parents=True,exist_ok=True)
 source={'status':'screen-tutorial-release','roleId':role,'title':title,'format':'Actual application screen captures with fictional isolated demo records; no live authentication, native installation or reconnect sync verification','voice':'User-selected English voice-02; not a verified Nigerian-English accent','scenes':scenes}
 (out/'source.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
 print(role,len(text))
 print(text+'\n')

## VERDICT: CLEAN

F1 closed. `submitBriefingAction` no longer calls `assertProjectMutationAuth`; it uses inline auth, returns `not_owner` for missing row or creator mismatch, returns `wrong_status` for non-draft, keeps the atomic `UPDATE ... eq("created_by", user.id).eq("status", "draft")`, and maps 0-row update to `wrong_status`. The `SubmitBriefingResult` union matches the new returns, and the Step 3 toast switch still routes `wrong_status` to `briefing.step3.toast.submit_wrong_status`.

F2 closed. `updateProjectCommitAction` now uses `.select("id")`, checks empty `updatedRows`, returns `wrong_status`, and the result union includes it. Client `runSave` sets `staleRef.current = true`, clears pending work, sets `autosave` to `"stale"`, and the CTA renders `briefing.step3.autosave.stale` in amber.

F3 closed. The fieldset wraps both the commit form section and final-notes section, uses `className="contents"`, and disables on `submitting || autosave === "stale"`. The back button and AlertDialog cancel/proceed controls remain outside the fieldset as specified.

Run log summary: LOOP 2 narrow verify CLEAN; F1/F2/F3 closures confirmed, no new HIGH/MED introduced.
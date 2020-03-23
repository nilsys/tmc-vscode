import * as vscode from "vscode";
import { ActionContext } from "../actions/types";
import { askForConfirmation, getCurrentExerciseId } from "../utils";
import { pasteExercise, resetExercise, submitExercise, testExercise } from "../actions";

export function registerCommands(
    context: vscode.ExtensionContext,
    actionContext: ActionContext,
): void {
    const { ui, workspaceManager, userData } = actionContext;

    context.subscriptions.push(
        vscode.commands.registerCommand("tmcView.activateEntry", ui.createUiActionHandler()),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("uploadArchive", async () => {
            const exerciseId = getCurrentExerciseId(workspaceManager);
            exerciseId
                ? submitExercise(exerciseId, actionContext)
                : vscode.window.showErrorMessage(
                      "Currently open editor is not part of a TMC exercise",
                  );
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("pasteExercise", async () => {
            const exerciseId = getCurrentExerciseId(workspaceManager);
            exerciseId
                ? pasteExercise(exerciseId, actionContext)
                : vscode.window.showErrorMessage(
                      "Currently open editor is not part of a TMC exercise",
                  );
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("runTests", async () => {
            const exerciseId = getCurrentExerciseId(workspaceManager);
            exerciseId
                ? testExercise(exerciseId, actionContext)
                : vscode.window.showErrorMessage(
                      "Currently open editor is not part of a TMC exercise",
                  );
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("resetExercise", async () => {
            const exerciseId = getCurrentExerciseId(workspaceManager);
            if (!exerciseId) {
                vscode.window.showErrorMessage(
                    "Currently open editor is not part of a TMC exercise",
                );
                return;
            }
            const exerciseData = workspaceManager.getExerciseDataById(exerciseId);
            if (exerciseData.err) {
                vscode.window.showErrorMessage("The data for this exercise seems to be missing");
                return;
            }

            (await askForConfirmation(
                `Are you sure you want to reset exercise ${exerciseData.val.name}?`,
            ))
                ? resetExercise(exerciseId, actionContext)
                : vscode.window.showInformationMessage(
                      `Reset canceled for exercise ${exerciseData.val.name}.`,
                  );
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("closeExercise", async () => {
            const exerciseId = getCurrentExerciseId(workspaceManager);
            if (!exerciseId) {
                vscode.window.showErrorMessage(
                    "Currently open editor is not part of a TMC exercise",
                );
                return;
            }
            const exerciseData = workspaceManager.getExerciseDataById(exerciseId);
            if (exerciseData.err) {
                vscode.window.showErrorMessage("The data for this exercise seems to be missing");
                return;
            }
            if (userData.getPassed(exerciseId)) {
                workspaceManager.closeExercise(exerciseId);
                return;
            }
            (await askForConfirmation(
                `Are you sure you want to close uncompleted exercise ${exerciseData.val.name}?`,
            ))
                ? workspaceManager.closeExercise(exerciseId)
                : vscode.window.showInformationMessage(
                      `Close canceled for exercise ${exerciseData.val.name}.`,
                  );
        }),
    );
}

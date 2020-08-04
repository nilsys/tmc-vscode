import * as vscode from "vscode";

import {
    cleanExercise,
    closeExercises,
    displayLocalCourseDetails,
    displayUserCourses,
    downloadOldSubmissions,
    openExercises,
    openSettings,
    openWorkspace,
    pasteExercise,
    resetExercise,
    submitExercise,
    testExercise,
} from "../actions";
import { ActionContext } from "../actions/types";
import { askForConfirmation, askForItem, showError, showNotification } from "../api/vscode";
import { LocalCourseData } from "../config/types";
import { Logger } from "../utils/";

// TODO: Fix error handling so user receives better error messages.
const errorMessage = "Currently open editor is not part of a TMC exercise";

export function registerCommands(
    context: vscode.ExtensionContext,
    actionContext: ActionContext,
): void {
    const { ui, userData, workspaceManager } = actionContext;
    Logger.log("Registering TMC VSCode commands");

    context.subscriptions.push(
        vscode.commands.registerCommand("tmcView.activateEntry", ui.createUiActionHandler()),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("tmc.selectAction", async () => {
            const exerciseData = workspaceManager.getCurrentExerciseData();
            if (exerciseData.err) {
                Logger.error(exerciseData.val.message, exerciseData.val);
                showError(exerciseData.val.message);
                return;
            }
            vscode.commands.executeCommand(
                "workbench.action.quickOpen",
                ">TestMyCode: ",
                "editorTextFocus && tmcWorkspaceActive",
            );
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("tmc.uploadArchive", async () => {
            const exerciseId = workspaceManager.getCurrentExerciseId();
            if (!exerciseId) {
                Logger.error(errorMessage);
                showError(errorMessage);
                return;
            }
            submitExercise(actionContext, exerciseId);
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("tmc.pasteExercise", async () => {
            const exerciseId = workspaceManager.getCurrentExerciseId();
            if (exerciseId) {
                const link = await pasteExercise(actionContext, exerciseId);
                link &&
                    showNotification(`Paste link: ${link}`, [
                        "Open URL",
                        (): Thenable<boolean> => vscode.env.openExternal(vscode.Uri.parse(link)),
                    ]);
            } else {
                Logger.error(errorMessage);
                showError(errorMessage);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("tmc.runTests", async () => {
            const exerciseId = workspaceManager.getCurrentExerciseId();
            if (!exerciseId) {
                Logger.error(errorMessage);
                showError(errorMessage);
                return;
            }
            testExercise(actionContext, exerciseId);
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("tmc.resetExercise", async () => {
            const exerciseId = workspaceManager.getCurrentExerciseId();
            if (!exerciseId) {
                Logger.error(errorMessage);
                showError(errorMessage);
                return;
            }
            const exerciseData = workspaceManager.getExerciseDataById(exerciseId);
            if (exerciseData.err) {
                const message = "The data for this exercise seems to be missing.";
                Logger.error(message, exerciseData.val);
                showError(message);
                return;
            }

            if (
                !(await askForConfirmation(
                    `Are you sure you want to reset exercise ${exerciseData.val.name}?`,
                    false,
                ))
            ) {
                return;
            }

            const editor = vscode.window.activeTextEditor;
            const resource = editor?.document.uri;
            const resetResult = await resetExercise(actionContext, exerciseId);
            if (resetResult.err) {
                const message = "Failed to reset currently open exercise.";
                Logger.error(message, resetResult.val);
                showError(message);
                return;
            }
            const openResult = await openExercises(
                actionContext,
                [exerciseId],
                exerciseData.val.course,
            );
            if (openResult.err) {
                const message = "Failed to open exercise after reset.";
                Logger.error(message, openResult.val);
                showError(message);
            }

            if (editor && resource) {
                vscode.commands.executeCommand<undefined>(
                    "vscode.open",
                    resource,
                    editor.viewColumn,
                );
            } else {
                Logger.warn(`Active file for exercise ${exerciseId} returned undefined?`);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("tmc.downloadOldSubmission", async () => {
            const exerciseId = workspaceManager.getCurrentExerciseId();
            if (!exerciseId) {
                Logger.error(errorMessage);
                showError(errorMessage);
                return;
            }
            const editor = vscode.window.activeTextEditor;
            const resource = editor?.document.uri;
            await downloadOldSubmissions(actionContext, exerciseId);
            if (editor && resource) {
                vscode.commands.executeCommand<undefined>(
                    "vscode.open",
                    resource,
                    editor.viewColumn,
                );
            } else {
                Logger.warn(`Active file for exercise ${exerciseId} returned undefined?`);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("tmc.closeExercise", async () => {
            const exerciseId = workspaceManager.getCurrentExerciseId();
            if (!exerciseId) {
                Logger.error(errorMessage);
                showError(errorMessage);
                return;
            }

            const exerciseData = workspaceManager.getExerciseDataById(exerciseId);
            if (exerciseData.err) {
                const message = "The data for this exercise seems to be missing.";
                Logger.error(message, exerciseData.val);
                showError(message);
                return;
            }
            if (
                userData.getPassed(exerciseId) ||
                (await askForConfirmation(
                    `Are you sure you want to close uncompleted exercise ${exerciseData.val.name}?`,
                ))
            ) {
                const result = await closeExercises(
                    actionContext,
                    [exerciseId],
                    exerciseData.val.course,
                );
                if (result.err) {
                    const message = "Error when closing exercise.";
                    Logger.error(message, result.val);
                    showError(message);
                    return;
                }
                vscode.commands.executeCommand("workbench.action.closeActiveEditor");
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("tmc.switchWorkspace", async () => {
            const courses = userData.getCourses();
            const currentWorkspace = vscode.workspace.name?.split(" ")[0];
            const courseWorkspace = await askForItem(
                "Select a course workspace to open",
                false,
                ...courses.map<[string, LocalCourseData]>((c) => [
                    c.name === currentWorkspace ? `${c.name} (Currently open)` : c.name,
                    c,
                ]),
            );
            if (courseWorkspace) {
                openWorkspace(actionContext, courseWorkspace.name);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("tmc.cleanExercise", async () => {
            const exerciseId = workspaceManager.getCurrentExerciseId();
            if (!exerciseId) {
                Logger.error(errorMessage);
                showError(errorMessage);
                return;
            }
            const result = await cleanExercise(actionContext, exerciseId);
            if (result.err) {
                const message = "Failed to clean exercise.";
                Logger.error(message, result.val);
                showError(message);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("tmc.openSettings", async () => {
            openSettings(actionContext);
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("tmc.myCourses", async () => {
            displayUserCourses(actionContext);
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("tmc.courseDetails", async () => {
            const courses = userData.getCourses();
            const options: [string, () => Thenable<void>][] = [];
            for (const course of courses) {
                options.push([
                    course.name,
                    async (): Promise<void> => displayLocalCourseDetails(actionContext, course.id),
                ]);
            }
            (
                await askForItem<() => Thenable<unknown>>(
                    "Which course page do you want to open?",
                    false,
                    ...options,
                )
            )?.();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("tmc.login", async () => {
            const username = await vscode.window.showInputBox({
                placeHolder: "Enter username",
                prompt: "Please enter your TMC username",
            });
            const password = await vscode.window.showInputBox({
                placeHolder: "Enter password",
                prompt: "Please enter your TMC password",
                password: true,
            });
            if (username && password) {
                const authed = await actionContext.tmc.authenticate(username, password);
                if (authed.err) {
                    showError(`Failed to login. ${authed.val.message}.`);
                    return;
                }
                ui.treeDP.updateVisibility([actionContext.visibilityGroups.LOGGED_IN]);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("tmc.logout", async () => {
            const deauth = await actionContext.tmc.deauthenticate();
            if (deauth.err) {
                showError(`Failed to logout. ${deauth.val.message}`);
                return;
            }
            ui.treeDP.updateVisibility([actionContext.visibilityGroups.LOGGED_IN.not]);
        }),
    );
}

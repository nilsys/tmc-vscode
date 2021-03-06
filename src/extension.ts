import * as fs from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";

import { checkForExerciseUpdates, checkForNewExercises } from "./actions";
import TMC from "./api/tmc";
import VSC, { showError } from "./api/vscode";
import WorkspaceManager from "./api/workspaceManager";
import { DEBUG_MODE, EXERCISE_CHECK_INTERVAL } from "./config/constants";
import Settings from "./config/settings";
import Storage from "./config/storage";
import { UserData } from "./config/userdata";
import { validateAndFix } from "./config/validate";
import * as init from "./init";
import TemporaryWebviewProvider from "./ui/temporaryWebviewProvider";
import UI from "./ui/ui";
import { Logger, LogLevel, semVerCompare } from "./utils";

let maintenanceInterval: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    Logger.configure(LogLevel.Verbose);
    Logger.log(`Starting extension in "${DEBUG_MODE ? "development" : "production"}" mode.`);

    const storage = new Storage(context);

    const resourcesResult = await init.resourceInitialization(context, storage);
    if (resourcesResult.err) {
        const message = "TestMyCode Initialization failed.";
        Logger.error(message, resourcesResult.val);
        showError(message);
        return;
    }
    const resources = resourcesResult.val;

    const settingsResult = await init.settingsInitialization(storage, resources);
    const settings = new Settings(storage, settingsResult, resources);
    await settings.verifyWorkspaceSettingsIntegrity();
    Logger.configure(settings.getLogLevel());

    const vsc = new VSC(settings);
    await vsc.activate();

    const currentVersion = resources.extensionVersion;
    const previousVersion = storage.getExtensionVersion();
    if (currentVersion !== previousVersion) {
        storage.updateExtensionVersion(currentVersion);
    }

    Logger.log(`VSCode version: ${vsc.getVSCodeVersion()}`);
    Logger.log(`TMC extension version: ${resources.extensionVersion}`);
    Logger.log(`Python extension version: ${vsc.getExtensionVersion("ms-python.python")}`);
    Logger.log(`Currently open workspace: ${vscode.workspace.name}`);

    const ui = new UI(context, resources, vscode.window.createStatusBarItem());
    const tmc = new TMC(storage, resources, () => settings.isInsider());

    const validationResult = await validateAndFix(storage, tmc, ui, resources);
    if (validationResult.err) {
        const message = "Data reconstruction failed.";
        Logger.error(message, validationResult.val);
        showError(message);
        return;
    }

    const authenticated = await tmc.isAuthenticated();
    if (authenticated.err) {
        showError("Failed to check if authenticated");
        Logger.error("Failed to check if authenticated", authenticated.val.message);
        Logger.show();
        return;
    }

    const LOGGED_IN = ui.treeDP.createVisibilityGroup(authenticated.val);
    const visibilityGroups = {
        LOGGED_IN,
    };

    const workspaceManager = new WorkspaceManager(storage, resources);
    await workspaceManager.initialize();
    tmc.setWorkspaceManager(workspaceManager);
    const userData = new UserData(storage);
    const temporaryWebviewProvider = new TemporaryWebviewProvider(resources, ui);
    const actionContext = {
        resources,
        settings,
        temporaryWebviewProvider,
        tmc,
        vsc,
        ui,
        userData,
        workspaceManager,
        visibilityGroups,
    };

    // Migration plan to move all exercises from closed-exercises
    const allExerciseData = workspaceManager.getAllExercises();
    const oldTMCWorkspace = path.join(
        resources.getWorkspaceFolderPath(),
        "TMC Exercises.code-workspace",
    );
    if (fs.existsSync(oldTMCWorkspace)) {
        fs.removeSync(oldTMCWorkspace);
    }
    allExerciseData?.forEach(async (ex) => {
        const closedPath = path.join(resources.getClosedExercisesFolderPath(), ex.id.toString());
        const openPath = path.join(
            resources.getExercisesFolderPath(),
            ex.organization,
            ex.course,
            ex.name,
        );
        if (fs.existsSync(closedPath)) {
            const ok = await workspaceManager.moveFolder(closedPath, openPath);
            if (ok.err) {
                const message = "Error while moving folders.";
                Logger.error(message, ok.val);
                showError(message);
            }
        }
    });

    // Start watcher after migration.
    workspaceManager.startWatcher();

    init.registerUiActions(actionContext);
    init.registerCommands(context, actionContext);

    if (authenticated.val) {
        checkForExerciseUpdates(actionContext);
        checkForNewExercises(actionContext);
    }

    if (maintenanceInterval) {
        clearInterval(maintenanceInterval);
    }

    maintenanceInterval = setInterval(async () => {
        const authenticated = await tmc.isAuthenticated();
        if (authenticated.err) {
            Logger.error("Failed to check if authenticated", authenticated.val.message);
        } else if (authenticated.val) {
            checkForExerciseUpdates(actionContext);
            checkForNewExercises(actionContext);
        }
    }, EXERCISE_CHECK_INTERVAL);

    init.watchForWorkspaceChanges(actionContext);

    const versionDiff = semVerCompare(currentVersion, previousVersion || "", "minor");
    if (versionDiff === undefined || versionDiff > 0) {
        await vscode.commands.executeCommand("tmc.welcome");
    }
}

export function deactivate(): void {
    maintenanceInterval && clearInterval(maintenanceInterval);
}

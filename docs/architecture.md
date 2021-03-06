# Architecture

A short documentation of the folder structure and what they contain.

Resources
------

Contains CSS files and HTML templates for the extension.  
HTML Templates to be deprecated in the future.

### [styles](https://github.com/rage/tmc-vscode/blob/master/resources/styles)

Bootstrap CSS and manually defined CSS styles for webview templates.

### [templates](https://github.com/rage/tmc-vscode/blob/master/resources/templates)

HTML Templates that are shown in webviews and temporary webviews generated by templateEngine.

Src
------

Extension starts from [extension.ts](https://github.com/rage/tmc-vscode/blob/master/src/extension.ts) and runs the files in [init](https://github.com/rage/tmc-vscode/tree/master/src/init) folder.

```utils``` - Generic utility functions that can be called from anywhere in the code + logger  
```errors.ts``` - Error types for extension

### [actions](https://github.com/rage/tmc-vscode/blob/master/src/actions)

- ```index.ts``` - Contains the TMC Menu actions.
- ```user.ts``` - Group of actions that respond to the user.
- ```webview.ts``` - Group of actions that provide webviews.
- ```workspace.ts``` - Group for actions that modify the TMC workspace.

### [api](https://github.com/rage/tmc-vscode/blob/master/src/api)

- ```tmc.ts``` - A Class for interacting with the TestMyCode service (API) & tmc-langs.
- ```workspaceManager.ts``` - Class for managing, opening and closing of exercises on disk.
- ```workspaceWatcher.ts``` - Watcher makes sure that there is no extra data in Exercises folder of the workspace (primarily generated by other extensions). Marks exercise data as missing if user has manually deleted an exercise.

### [config](https://github.com/rage/tmc-vscode/blob/master/src/config)

- ```constants.ts``` - Contains constants used by the extension.
- ```resources.ts``` - Resource class containing the paths
- ```storage.ts``` - Interface class for accessing stored TMC configuration and data.
- ```userdata.ts``` - A Class for managing the user data in the storage.
- ```validate.ts``` - Validates the data saved in the storage.
- ```settings.ts``` - Extension settings class that communicates changes to storage and workspace file.

### [init](https://github.com/rage/tmc-vscode/blob/master/src/init)

- ```commands.ts``` - Contains the VSCode commands for the extension
- ```resources.ts``` - Checks whether all needed resources are in place and creates/downloads them if necessary
- ```ui.ts``` - Registers UI actions (e.g. Add new course -button & Removing course from My Courses & login & etc.) and the treeview links.
- ```settings.ts``` - Initializes extension settings from storage or set as default if not defined.

### [ui](https://github.com/rage/tmc-vscode/blob/master/src/ui)

- ```templates```  
Folder contains the new .jsx templates.

- ```treeview```  
Folder contains the functionality for the TMC: MENU and the visibility groups of the links in the menu, depending on the state (logged in or out)
  - ```treeview.ts``` - A class for managing the TMC menu treeview.
  - ```visibility.ts``` - Logic class for managing visibility of treeview actions
- ```templateEngine.ts```- Creates an HTML document from a template, with a default CSS applied, contains the handlebar helpers for the HTML templates.
- ```temporaryWebview.ts``` - Functionality for the webview window, the window is used for Running & Submitting exercises etc.
- ```temporaryWebviewProvider.ts``` - Used for recycling the temporary webviews. Provides temporary webview for those views that need it.
- ```ui.ts``` -  A class for interacting with the user through graphical means
- ```webview.ts``` - A class for managing the Webview component of the plugin UI, to be used through the UI class

### [test](https://github.com/rage/tmc-vscode/blob/master/src/test)

- Tests for the extension.

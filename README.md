# Mark Files

**Mark Files** is a cute vscode extension that enables to mark files in the file explorer.

## Features

The extension allows you to mark/unmark files by:

* Providing a `scope.txt` file in the workspace root folder. The file contains a list of absolute file paths or relative file paths to the workspace root folder. The file paths must be separated by newlines.
* Right clicking on a file in the file explorer and selecting `Mark/Unmark File` from the context menu.
* Right clicking on an editor tab and selecting `Mark/Unmark File` from the context menu.

Note that the marked files are stored in a `scope.txt` file in the workspace root folder. If the file does not exist, it will be created.

//TODO: Add images

## Extension Settings

This extension contributes the following settings:

* `markfiles.colorMarkedFile`: Choose whether to mark files by adding an icon, changing the color of the file name or both.
* `markfiles.markedFileIcon`: Choose the symbol to use for marked files. Note that the symbol must be a single unicode character.

The color used to mark files can be changed by modifying the following key in your `settings.json` file:

```json
"workbench.colorCustomizations": {
    "markfiles.markedFileColor": "#7ad108"
}
```


## Release Notes

Check [CHANGELOG.md](CHANGELOG.md)

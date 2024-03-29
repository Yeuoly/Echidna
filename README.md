# Echidna

Discover the contributions of every team member with ease using this Visual Studio Code extension.

## Features
- View the contributions of every team member in a single view
- View every file and folder that a team member has contributed to
- Auto summarise the contributions of every team member
- Auto write the daily report for a member in markdown format

## Requirements
- Git

## Extension Settings
You need to set the following settings in order for the extension to work properly:
- `echidna.OpenAIKey`: OpenAI API key
- `echidna.OpenAIDefaultModel`: OpenAI default model default to `gpt-3.5-turbo-1106`
- `echidna.OpenAIDefaultTemperature`: OpenAI default temperature default to `0.5`
- `echidna.OpenAIUrl`: OpenAI API url default to `https://api.openai.com/v1/chat/completions`

## Known Issues
- All files generated by the extension are saved in the .vscode folder in the root directory of the project
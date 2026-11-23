import { Config } from '@remotion/cli/config';

// This PC is Windows on ARM: Remotion can't download its own browser there, so use the installed Chrome.
Config.setBrowserExecutable('C:/Program Files/Google/Chrome/Application/chrome.exe');

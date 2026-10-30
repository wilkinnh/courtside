# tvOS URL Exposer

A standalone tvOS 16+ diagnostic app that registers `foxone://`. No dependencies or project generator required.

## Install on Apple TV

1. Install full Xcode and its tvOS platform support on your Mac.
2. Open `URLExposer.xcodeproj` and select the **URLExposer** scheme.
3. Under the target's **Signing & Capabilities**, select your development team. Change `dev.courtside.URLExposer` to an available bundle identifier if necessary. Keep the `foxone` URL scheme in Info.plist.
4. Pair your Apple TV with Xcode using **Window → Devices and Simulators** (on the TV, open **Settings → Remotes and Devices → Remote App and Devices**). Enable Developer Mode if prompted.
5. Remove the real Fox One app so two installed apps aren't competing for the same scheme.
6. Select the Apple TV as the run destination and run. Leave Xcode attached if you want to copy console output.
7. Return to the TV Home screen and repeat the action that normally opens Fox One. Return to URL Exposer if necessary and select the newest **openURL** capture.

The app displays the complete `URL.absoluteString` supplied by UIKit, encoded path/query/fragment, decoded query items (including duplicate keys), and every supplied callback option with its runtime type and diagnostic dump. Source application and annotation are shown only if the sender/OS supplies them. There is no invented or inferred sender information.

Each capture is also printed to Xcode's debug console. The latest 50 records are stored locally in UserDefaults, including launch records, and can be cleared on screen. A cold launch can generate both a Launch record and an openURL record; these are intentionally separate. A normal manual launch has no URL. tvOS may purge local app data, so copy important output from Xcode. URLs and options are logged verbatim and may contain account-specific tokens; remove those before sharing captures.

## Simulator smoke check

With an Apple TV simulator booted and this app installed:

```sh
xcrun simctl openurl booted 'foxone://watch/example?contentId=123&tag=one&tag=two&title=Hello%20World&flag#start'
```

Verify an **openURL** record with the full URL, both `tag` values, the decoded title, and a valueless `flag`. Repeat while the app is open, backgrounded, and terminated to exercise warm and cold delivery. Reopen the app to check saved history, then use **Clear saved captures**.

To build without device signing on a Mac with the tvOS SDK:

```sh
xcodebuild -project URLExposer.xcodeproj -scheme URLExposer -sdk appletvsimulator -configuration Debug -derivedDataPath /tmp/URLExposer-build CODE_SIGNING_ALLOWED=NO build
```

## Scope

This registers a custom scheme, using an application delegate lifecycle without a scene manifest to retain all openURL options. It also records delivered user activities for diagnostics. It does not claim Fox One's bundle identity, associated domains, or entitlements. A sender that checks Fox One's installation/bundle identity, an Apple TV content integration that requires the official app, or an HTTPS universal link may not route to this app after Fox One is removed. No capture therefore does not prove that no deep link exists. An ordinary launch record proves the app started but does not prove a URL was delivered.

Apple references: [Custom URL schemes](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app) and [application(_:open:options:)](https://developer.apple.com/documentation/uikit/uiapplicationdelegate/application(_:open:options:)).

import UIKit
import SwiftUI

// Deliberately use the application lifecycle (no scene manifest) so URL options
// remain available, including sourceApplication and annotation when supplied.
@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    private let captures = CaptureStore()

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = UIHostingController(rootView: CaptureView(store: captures))
        window.makeKeyAndVisible()
        self.window = window
        captures.record(kind: "Launch", url: launchOptions?[.url] as? URL,
                        options: launchOptions?.map { ($0.key.rawValue, $0.value) } ?? [])
        return true
    }

    func application(_ app: UIApplication, open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        captures.record(kind: "openURL", url: url,
                        options: options.map { ($0.key.rawValue, $0.value) })
        return true
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        captures.record(kind: "User activity", url: userActivity.webpageURL, options: [
            ("activityType", userActivity.activityType),
            ("title", userActivity.title as Any),
            ("userInfo", userActivity.userInfo as Any)
        ])
        return true
    }
}

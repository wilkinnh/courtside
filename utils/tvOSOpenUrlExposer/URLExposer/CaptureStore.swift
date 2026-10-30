import Foundation
import Combine

struct Capture: Codable, Identifiable {
    var id = UUID()
    let date: Date
    let kind: String
    let detail: String
}

final class CaptureStore: ObservableObject {
    @Published private(set) var entries: [Capture] = []
    @Published private(set) var storageError: String?
    private let key = "URLExposer.captures.v1"

    init() {
        if let data = UserDefaults.standard.data(forKey: key) {
            do { entries = try JSONDecoder().decode([Capture].self, from: data) }
            catch { storageError = "Could not read saved captures: \(error)" }
        }
    }

    func record(kind: String, url: URL?, options: [(String, Any)]) {
        var lines = ["Callback: \(kind)", "Raw URL (absoluteString):", url?.absoluteString ?? "(none)"]
        if let url = url, let parts = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            lines += ["", "URL components:", "scheme: \(parts.scheme ?? "(none)")",
                      "host: \(parts.host ?? "(none)")", "port: \(parts.port.map(String.init) ?? "(none)")",
                      "percentEncodedPath: \(parts.percentEncodedPath)", "decoded path: \(parts.path)",
                      "percentEncodedQuery: \(parts.percentEncodedQuery ?? "(none)")",
                      "percentEncodedFragment: \(parts.percentEncodedFragment ?? "(none)")",
                      "", "Query items (decoded, preserving order and duplicates):"]
            for item in parts.queryItems ?? [] {
                lines.append("\(String(reflecting: item.name)) = \(item.value.map { String(reflecting: $0) } ?? "(no value)")")
            }
        }
        lines += ["", "Callback options (all supplied keys):"]
        if options.isEmpty { lines.append("(none)") }
        for (key, value) in options.sorted(by: { $0.0 < $1.0 }) {
            var representation = ""
            dump(value, to: &representation)
            lines.append("\(key) [\(type(of: value))]:\n\(representation)")
        }
        let entry = Capture(date: Date(), kind: kind, detail: lines.joined(separator: "\n"))
        print("\n=== URL Exposer \(entry.date.ISO8601Format()) ===\n\(entry.detail)\n=== End capture ===\n")
        entries.insert(entry, at: 0)
        entries = Array(entries.prefix(50))
        save()
    }

    func clear() {
        entries.removeAll()
        save()
    }

    private func save() {
        do {
            UserDefaults.standard.set(try JSONEncoder().encode(entries), forKey: key)
            storageError = nil
        } catch { storageError = "Could not save captures: \(error)" }
    }
}

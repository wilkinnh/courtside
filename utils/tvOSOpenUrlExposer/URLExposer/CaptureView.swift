import SwiftUI

struct CaptureView: View {
    @ObservedObject var store: CaptureStore

    var body: some View {
        NavigationView {
            List {
                Section {
                    Text("Waiting for foxone:// links. Newest captures appear first. Select a capture to read every field.")
                    if let error = store.storageError { Text(error).foregroundColor(.red) }
                }
                Section(header: Text("Recent captures (up to 50)")) {
                    ForEach(store.entries) { entry in
                        NavigationLink(destination: ScrollView {
                            Text(entry.detail)
                                .font(.system(size: 24, design: .monospaced))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(48)
                        }.navigationTitle(entry.kind)) {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("\(entry.kind) • \(entry.date.formatted())")
                                Text(entry.detail).font(.system(size: 22, design: .monospaced)).lineLimit(3)
                            }
                        }
                    }
                }
                Button("Clear saved captures", role: .destructive) { store.clear() }
            }
            .navigationTitle("foxone:// URL Exposer")
        }
    }
}

// Applies app.config.json (name, app ID / URL scheme) to the iOS and Android
// projects. Safe to run repeatedly. Run after changing app.config.json:
//   npm run native:config && npm run native:sync
import { readFileSync, writeFileSync } from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const { appName, appId } = JSON.parse(readFileSync(path.join(root, "app.config.json"), "utf8"));
if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(appId)) throw new Error(`Invalid appId "${appId}". Use reverse-domain form, e.g. com.yourcompany.app`);
const xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function update(file, fn) {
  const p = path.join(root, file);
  const before = readFileSync(p, "utf8");
  const after = fn(before);
  if (after !== before) { writeFileSync(p, after); console.log("updated", file); }
}

// ---------- Android ----------
// The Java package / namespace stays fixed; only the store-facing applicationId changes.
update("android/app/build.gradle", (s) => s.replace(/applicationId "[^"]+"/, `applicationId "${appId}"`));
update("android/app/src/main/res/values/strings.xml", (s) => s
  .replace(/(<string name="app_name">)[^<]*(<\/string>)/, `$1${xml(appName)}$2`)
  .replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/, `$1${xml(appName)}$2`)
  .replace(/(<string name="package_name">)[^<]*(<\/string>)/, `$1${appId}$2`)
  .replace(/(<string name="custom_url_scheme">)[^<]*(<\/string>)/, `$1${appId}$2`));
update("android/app/src/main/AndroidManifest.xml", (s) => s.includes("@string/custom_url_scheme") ? s : s.replace(
  /(<category android:name="android.intent.category.LAUNCHER" \/>\s*<\/intent-filter>)/,
  `$1

            <!-- Sign-up confirmation and password-reset links open the app -->
            <intent-filter android:autoVerify="false">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="@string/custom_url_scheme" />
            </intent-filter>`));

// ---------- iOS ----------
update("ios/App/App.xcodeproj/project.pbxproj", (s) => s.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${appId};`));
update("ios/App/App/Info.plist", (s) => {
  s = s.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${xml(appName)}$2`);
  const urlTypes = `\t<key>CFBundleURLTypes</key>
\t<array>
\t\t<dict>
\t\t\t<key>CFBundleURLName</key>
\t\t\t<string>${appId}</string>
\t\t\t<key>CFBundleURLSchemes</key>
\t\t\t<array>
\t\t\t\t<string>${appId}</string>
\t\t\t</array>
\t\t</dict>
\t</array>
`;
  if (s.includes("<key>CFBundleURLTypes</key>")) {
    s = s.replace(/\t<key>CFBundleURLTypes<\/key>\n\t<array>[\s\S]*?\n\t<\/array>\n/, urlTypes);
  } else {
    s = s.replace(/<dict>\n/, `<dict>\n${urlTypes}`);
  }
  // Vendors can attach listing photos; iOS requires a reason string for camera/photos.
  if (!s.includes("NSCameraUsageDescription")) {
    s = s.replace(/<dict>\n/, `<dict>
\t<key>NSCameraUsageDescription</key>
\t<string>Take a photo to add to a marketplace listing.</string>
\t<key>NSPhotoLibraryUsageDescription</key>
\t<string>Choose a photo to add to a marketplace listing.</string>
`);
  }
  // No encryption beyond standard HTTPS: answers Apple's export compliance question.
  if (!s.includes("ITSAppUsesNonExemptEncryption")) s = s.replace(/<dict>\n/, `<dict>\n\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n`);
  return s;
});
// ---------- Cloud build ----------
update("codemagic.yaml", (s) => s.replace(/bundle_identifier: [^\s#]+/, `bundle_identifier: ${appId}`));

console.log(`Native projects use name "${appName}" and ID ${appId}`);

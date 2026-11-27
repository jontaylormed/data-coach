# JavaScript syntax check, with no Node needed: Windows still ships chakra.dll (the old Edge's engine), and its
# hosting API can parse a script without running it. A build dot-sources this file and calls Test-JsSyntax on each
# source file; a syntax error (a missing bracket, a comment that swallowed code) fails the build with its file and line.
# Chakra parses modern JavaScript up to about 2018 (arrows, template strings, destructuring, array spread, **),
# but not object spread ({ ...a }), optional chaining (?.) or ??: write Object.assign and plain checks instead.

if (-not ('JsSyntax' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class JsSyntax {
  [DllImport("chakra.dll")] static extern int JsCreateRuntime(int attributes, IntPtr threadService, out IntPtr runtime);
  [DllImport("chakra.dll")] static extern int JsCreateContext(IntPtr runtime, out IntPtr context);
  [DllImport("chakra.dll")] static extern int JsSetCurrentContext(IntPtr context);
  [DllImport("chakra.dll")] static extern int JsDisposeRuntime(IntPtr runtime);
  [DllImport("chakra.dll", CharSet = CharSet.Unicode)] static extern int JsParseScript(string script, UIntPtr sourceContext, string sourceUrl, out IntPtr result);
  [DllImport("chakra.dll")] static extern int JsGetAndClearException(out IntPtr exception);
  [DllImport("chakra.dll", CharSet = CharSet.Unicode)] static extern int JsGetPropertyIdFromName(string name, out IntPtr propertyId);
  [DllImport("chakra.dll")] static extern int JsGetProperty(IntPtr obj, IntPtr propertyId, out IntPtr value);
  [DllImport("chakra.dll")] static extern int JsConvertValueToString(IntPtr value, out IntPtr str);
  [DllImport("chakra.dll")] static extern int JsStringToPointer(IntPtr value, out IntPtr chars, out UIntPtr length);
  static string Prop(IntPtr obj, string name) {
    IntPtr id, v, s, p; UIntPtr n;
    if (JsGetPropertyIdFromName(name, out id) != 0 || JsGetProperty(obj, id, out v) != 0) return "";
    if (JsConvertValueToString(v, out s) != 0 || JsStringToPointer(s, out p, out n) != 0) return "";
    return Marshal.PtrToStringUni(p, (int)n.ToUInt32());
  }
  // Returns "" when the script parses, otherwise "line N: message". Line numbers from Chakra start at 0.
  public static string Check(string script, string name) {
    IntPtr runtime, context, result, ex;
    if (JsCreateRuntime(0, IntPtr.Zero, out runtime) != 0) return "could not start the JavaScript engine";
    try {
      JsCreateContext(runtime, out context);
      JsSetCurrentContext(context);
      int code = JsParseScript(script, UIntPtr.Zero, name, out result);
      if (code == 0) return "";
      if (JsGetAndClearException(out ex) != 0) return "error code " + code;
      string line = Prop(ex, "line"), msg = Prop(ex, "message");
      int n; if (int.TryParse(line, out n)) line = (n + 1).ToString();
      return "line " + line + ": " + msg;
    } finally { JsSetCurrentContext(IntPtr.Zero); JsDisposeRuntime(runtime); }
  }
}
'@
}

# Each file is parsed on its own, so an error names its own file and line.
function Test-JsSyntax([string]$code, [string]$name) {
  $r = [JsSyntax]::Check($code, $name)
  if ($r) { "$name, $r" }
}

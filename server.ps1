$listener = New-Object System.Net.HttpListener
$port = 8089
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Output "HTTP server started on http://localhost:$port/"
$dir = Get-Location

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response
        $urlPath = $req.Url.AbsolutePath.TrimStart('/')
        if ([string]::IsNullOrEmpty($urlPath)) { $urlPath = "index.htm" }
        # decode url
        $urlPath = [System.Uri]::UnescapeDataString($urlPath)
        $filePath = Join-Path $dir $urlPath
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".htm" { "text/html; charset=utf-8" }
                ".js" { "application/javascript; charset=utf-8" }
                ".css" { "text/css; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png" { "image/png" }
                ".jpg" { "image/jpeg" }
                ".svg" { "image/svg+xml" }
                default { "application/octet-stream" }
            }
            $res.ContentType = $contentType
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
            $buf = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $res.OutputStream.Write($buf, 0, $buf.Length)
        }
        $res.Close()
    }
} finally {
    $listener.Stop()
}

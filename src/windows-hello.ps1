# Windows Hello Biometric Verification Script
# This script triggers the Windows Hello prompt for fingerprint/face recognition

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$null = [Windows.Security.Credentials.UI.UserConsentVerifier,Windows.Security.Credentials.UI,ContentType=WindowsRuntime]
$null = [Windows.Foundation.IAsyncOperation``1,Windows.Foundation,ContentType=WindowsRuntime]

# Helper to await async operations
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and 
    $_.GetParameters().Count -eq 1 -and 
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
})[0]

function Await($WinRtTask, $ResultType) {
    $asTaskGeneric = $asTask.MakeGenericMethod($ResultType)
    $netTask = $asTaskGeneric.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
}

try {
    # Check availability
    $availability = Await ([Windows.Security.Credentials.UI.UserConsentVerifier]::CheckAvailabilityAsync()) ([Windows.Security.Credentials.UI.UserConsentVerifierAvailability])

    if ($availability -ne [Windows.Security.Credentials.UI.UserConsentVerifierAvailability]::Available) {
        Write-Output "UNAVAILABLE:$availability"
        exit 1
    }

    # Request verification with Windows Hello
    $result = Await ([Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync("RBAC OS - Verify your identity")) ([Windows.Security.Credentials.UI.UserConsentVerificationResult])

    switch ($result) {
        ([Windows.Security.Credentials.UI.UserConsentVerificationResult]::Verified) {
            Write-Output "VERIFIED"
            exit 0
        }
        ([Windows.Security.Credentials.UI.UserConsentVerificationResult]::Canceled) {
            Write-Output "CANCELED"
            exit 2
        }
        default {
            Write-Output "FAILED:$result"
            exit 2
        }
    }
} catch {
    Write-Output "ERROR:$($_.Exception.Message)"
    exit 3
}

; ZNinja NSIS Path Integration Script
; This script is included in the electron-builder build process.

!macro customInstall
  DetailPrint "Updating System Path for ZNinja..."
  
  ; Add $INSTDIR to the User PATH
  ; 1. Read current Path
  ReadRegStr $0 HKCU "Environment" "Path"
  
  ; 2. Check if $INSTDIR is already in Path
  Push $0
  Push "$INSTDIR"
  Call StrContains
  Pop $1
  
  StrCmp $1 "true" PathExists
    ; Append to Path
    StrCmp $0 "" PathEmpty
      StrCpy $0 "$0;$INSTDIR"
      Goto PathSave
    PathEmpty:
      StrCpy $0 "$INSTDIR"
    PathSave:
      WriteRegStr HKCU "Environment" "Path" "$0"
      
      ; Broadcast environment change to system
      SendMessage 0xffff 0x001A 0 0 /TIMEOUT=5000
      DetailPrint "PATH updated successfully."
    Goto EndPathInstall

  PathExists:
    DetailPrint "ZNinja is already in the system PATH."

  EndPathInstall:
!macroend

!macro customUnInstall
  DetailPrint "Removing ZNinja from System Path..."
  
  ; Read current Path
  ReadRegStr $0 HKCU "Environment" "Path"
  
  ; Remove $INSTDIR and its leading/trailing semicolon
  Push $0
  Push ";$INSTDIR"
  Call StrReplace
  Pop $0
  
  Push $0
  Push "$INSTDIR;"
  Call StrReplace
  Pop $0
  
  Push $0
  Push "$INSTDIR"
  Call StrReplace
  Pop $0
  
  WriteRegStr HKCU "Environment" "Path" "$0"
  
  ; Broadcast environment change
  SendMessage 0xffff 0x001A 0 0 /TIMEOUT=5000
  DetailPrint "PATH cleaned successfully."
!macroend

; Helper function: StrContains
; Checks if string $1 is in string $0
Function StrContains
  Exch $1 ; substring
  Exch
  Exch $0 ; string
  Push $2
  Push $3
  Push $4
  StrLen $2 $1
  StrLen $3 $0
  StrCpy $4 0
  loop:
    StrCpy $5 $0 $2 $4
    StrCmp $5 $1 found
    IntOp $4 $4 + 1
    IntCmp $4 $3 loop loop
    StrCpy $1 "false"
    Goto done
  found:
    StrCpy $1 "true"
  done:
    Pop $4
    Pop $3
    Pop $2
    Pop $0
    Exch $1
FunctionEnd

; Helper function: StrReplace
; Replaces all occurrences of $1 in $0 with empty string (or whatever is in memory)
Function StrReplace
  Exch $1 ; substring to replace
  Exch
  Exch $0 ; original string
  Push $2
  Push $3
  Push $4
  Push $5
  StrLen $2 $1
  StrCpy $5 ""
  loop:
    StrCpy $3 $0 $2
    StrCmp $3 "" done
    StrCmp $3 $1 found
    StrCpy $4 $0 1
    StrCpy $5 "$5$4"
    StrCpy $0 $0 "" 1
    Goto loop
  found:
    StrCpy $0 $0 "" $2
    Goto loop
  done:
    StrCpy $0 $5
    Pop $5
    Pop $4
    Pop $3
    Pop $2
    Pop $1
    Exch $0
FunctionEnd

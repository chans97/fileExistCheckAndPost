!macro customInstall 
    DetailPrint "Register FileExistCheckAndPost URI Handler"
    DeleteRegKey HKCR "FileExistCheckAndPost"
    WriteRegStr HKCR "FileExistCheckAndPost" "" "URL:FileExistCheckAndPost"
    WriteRegStr HKCR "FileExistCheckAndPost" "URL Protocol" ""
    WriteRegStr HKCR "FileExistCheckAndPost\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    WriteRegStr HKCR "FileExistCheckAndPost\shell" "" ""
    WriteRegStr HKCR "FileExistCheckAndPost\shell\Open" "" ""
    WriteRegStr HKCR "FileExistCheckAndPost\shell\Open\command" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME} %1"
!macroend
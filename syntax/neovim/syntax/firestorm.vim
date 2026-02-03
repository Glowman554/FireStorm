" -------------------------
" Keywords
" -------------------------
syntax keyword firestormKeyword
  \ if else while loop for return do function end
  \ offset range up down continue break

" -------------------------
" Types
" -------------------------
syntax keyword firestormType
  \ void int str chr ptr i32 i64

" -------------------------
" Preprocessor directives
" -------------------------
syntax match firestormPreprocessor
  \ /^\$\%(use\|include\|native\)\>.*$/

" -------------------------
" Comments
" -------------------------
syntax match firestormComment
  \ /\/\/.*$/

" -------------------------
" Strings
" -------------------------
syntax region firestormString
  \ start=/"/ end=/"/
  \ skip=/\\"/

syntax region firestormChar
  \ start=/'/ end=/'/
  \ skip=/\\'/

" -------------------------
" Numbers
" -------------------------
" Hex: 0xFF
syntax match firestormHex
  \ /\<0x[0-9A-Fa-f]\+\>/

" Binary: 0b1010
syntax match firestormBin
  \ /\<0b[01]\+\>/

" Decimal
syntax match firestormNumber
  \ /\<\d\+\>/

" -------------------------
" Highlight links
" -------------------------
highlight link firestormKeyword      Keyword
highlight link firestormType         Type
highlight link firestormPreprocessor PreProc
highlight link firestormComment      Comment
highlight link firestormString       String
highlight link firestormChar         String
highlight link firestormHex          Number
highlight link firestormBin          Number
highlight link firestormNumber       Number


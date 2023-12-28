; Avatar file:
; 0-1 - offset to choreography index
; 2-3 - offset to choreography tables
; 4-6 - unknown, seems to always be ED 14 00
; 7-18 - offsets of limbs (two bytes each, 6 limbs)

; 19-44 - as follows
; (display_avatar in animate.m:30 copies 26 bytes into these tables)

head_cel_number:
	byte	4
frozen_when_stands:
	byte	0xff

pattern_for_limb:
	byte	AVATAR_LEG_LIMB
	byte	AVATAR_LEG_LIMB
	byte	AVATAR_ARM_LIMB
	byte	AVATAR_TORSO_LIMB
	byte	AVATAR_FACE_LIMB
	byte	AVATAR_ARM_LIMB

fv_cels:					; order of cels front view
	byte	0,1,3,4,2,5
bv_cels:
	byte	5,2,4,0,1,3

cels_affected_by_height:
	byte	0,0,1,1,1,1

; "cel" here doesn't mean "cel" in the data structure sense, as each limb 
; can have many different cels. however, only one cel per limb is 
; displayed at any given time.

; avatar_height is defined in orientation - either 0 or 8 depending on the high bit

; limbs are _embedded_ props?? animate.m get_av_prop_address
(A * 2) + 8 - high byte of offset!!


; limb "prop":
; 0 - count of cel index "frames", minus one 

; limbs can have up to 16 cels. therefore, instead of defining states as
; an index into a table of bitmasks, states are defined as an index into
; the table of cels directly. only one cel is visible per-limb at a time.

; 1-2 - unknown. first byte seems to always be zero. second byte seems
;   to be correlated with the number of frames or cels, but isn't a direct
;   count of either.
; 3 - list of "frames" (cel indexes), (count + 1) bytes long
; (count + 4) - list of cel offsets (two-byte values)

; cels are in exactly the same format as in props.

; choreography index:
; TBD

; choreography tables:
; TBD
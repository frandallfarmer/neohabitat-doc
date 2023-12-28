; Avatar file:
; 0-1 - offset to choreography index
; 2-3 - offset to choreography tables
; 4-6 - unknown, seems to always be ED 14 00
; 7-18 - array of offsets of limbs (two bytes each, 6 limbs)

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

; avatar_height is defined in orientation - either 0 or 8 depending on 
; the high bit

; limb "prop":
; 0 - count of cel index "frames", minus one 

; limbs can have up to 16 cels. therefore, instead of defining states as
; an index into a table of bitmasks, states are defined as an index into
; the table of cels directly. only one cel is visible per-limb at a time.

; 1-2 - unknown. first byte seems to always be zero. second byte seems
;   to be correlated with the number of frames or cels, but isn't a direct
;   count of either.
; 3 - array of "frames" (cel indexes), (count + 1) bytes long
; (count + 4) - array of cel offsets (two-byte values)

; cels are in exactly the same format as in props.

; choreography index:
; array of bytes, which are indexes into choreography tables.
; this is indexed by the bottom 7 bits of `requested_chore`.

Possible choreography values? some special cases are handled in chore.m:212
which suggests these as valid values.
;	define	AV_ACT_init		= 0x80	+ 0
	define	AV_ACT_stand		= 0x80	+ 1
	define	AV_ACT_walk		= 0x80	+ 2
	define	AV_ACT_hand_back	= 0x80	+ 3
	define	AV_ACT_sit_floor	= 0x80	+ 4
	define	AV_ACT_sit_chair	= 0x80	+ 5
	define	AV_ACT_bend_over	= 0x80	+ 6
	define	AV_ACT_bend_back	= 0x80	+ 7
	define	AV_ACT_point		= 0x80	+ 8
	define	AV_ACT_throw		= 0x80	+ 9
	define	AV_ACT_get_shot		= 0x80	+ 10
	define	AV_ACT_jump		= 0x80	+ 11
	define	AV_ACT_punch		= 0x80	+ 12
	define	AV_ACT_wave		= 0x80	+ 13
	define	AV_ACT_frown		= 0x80	+ 14
	define	AV_ACT_stand_back	= 0x80	+ 15
	define	AV_ACT_walk_front	= 0x80	+ 16
	define	AV_ACT_walk_back	= 0x80	+ 17
	define	AV_ACT_stand_front	= 0x80	+ 18
	define	AV_ACT_unpocket		= 0x80	+ 19
	define	AV_ACT_gimme		= 0x80	+ 20
	define	AV_ACT_knife		= 0x80	+ 21
	define	AV_ACT_arm_get		= 0x80	+ 22
	define	AV_ACT_hand_out		= 0x80	+ 23
	define	AV_ACT_operate		= 0x80	+ 24
	define	AV_ACT_arm_back		= 0x80	+ 25
	define	AV_ACT_shoot1		= 0x80	+ 26
	define	AV_ACT_shoot2		= 0x80	+ 27
	define	AV_ACT_nop		= 0x80	+ 28
	define	AV_ACT_sit_front	= 0x80	+ 29

; choreography tables:
; an array of arrays of bytes, indicating "states". if the high bit is 
; set, this signals the end of the inner array.
; unclear at this time how exactly these values are interpreted.

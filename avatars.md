; 0 - number of animation bytes (WRONG? 0x16 in file)
; 1 - disk_face (byte)
; 3 - bits for cels to draw

; 7 - offsets of embedded props for limbs (two bytes each, 6 limbs)

; 19: display_avatar copies _26 bytes_

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

limbs_affected_by_height:
	byte	0,0,1,1,1,1

; limbs are _embedded_ props?? animate.m get_av_prop_address
(A * 2) + 8 - high byte of offset!!

avatars can have up to 16 cels - each frame is _only_ 1 cel, rather than a composite
byte_to_bit lookup table turns it into a bitmask, used by cels_to_draw_2 & cels_to_draw

; embedded limb "prop":
; 0 - number of animation bytes A
; 1 - unk
; 2 - unk
; 3:A+2 - first 
; A+3 - unk
; A+4:A+20 - cel offsets (Word)

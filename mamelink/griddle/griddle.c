/* A Bison parser, made by GNU Bison 3.8.2.  */

/* Bison implementation for Yacc-like parsers in C

   Copyright (C) 1984, 1989-1990, 2000-2015, 2018-2021 Free Software Foundation,
   Inc.

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <https://www.gnu.org/licenses/>.  */

/* As a special exception, you may create a larger work that contains
   part or all of the Bison parser skeleton and distribute that work
   under terms of your choice, so long as that work isn't itself a
   parser generator using the skeleton or a modified version thereof
   as a parser skeleton.  Alternatively, if you modify or redistribute
   the parser skeleton itself, you may (at your option) remove this
   special exception, which will cause the skeleton and the resulting
   Bison output files to be licensed under the GNU General Public
   License without this special exception.

   This special exception was added by the Free Software Foundation in
   version 2.2 of Bison.  */

/* C LALR(1) parser skeleton written by Richard Stallman, by
   simplifying the original so-called "semantic" parser.  */

/* DO NOT RELY ON FEATURES THAT ARE NOT DOCUMENTED in the manual,
   especially those whose name start with YY_ or yy_.  They are
   private implementation details that can be changed or removed.  */

/* All symbols defined below should begin with yy or YY, to avoid
   infringing on user name space.  This should be done even for local
   variables, as they might otherwise be expanded by user macros.
   There are some unavoidable exceptions within include files to
   define necessary library symbols; they are noted "INFRINGES ON
   USER NAME SPACE" below.  */

/* Identify Bison output, and Bison version.  */
#define YYBISON 30802

/* Bison version string.  */
#define YYBISON_VERSION "3.8.2"

/* Skeleton name.  */
#define YYSKELETON_NAME "yacc.c"

/* Pure parsers.  */
#define YYPURE 0

/* Push parsers.  */
#define YYPUSH 0

/* Pull parsers.  */
#define YYPULL 1




/* First part of user prologue.  */
#line 1 "griddle.y"

#define DEFINE_EXTERNS
#include "griddleDefs.h"
#define YYSTYPE intptr_t

#line 77 "y.tab.c"

# ifndef YY_CAST
#  ifdef __cplusplus
#   define YY_CAST(Type, Val) static_cast<Type> (Val)
#   define YY_REINTERPRET_CAST(Type, Val) reinterpret_cast<Type> (Val)
#  else
#   define YY_CAST(Type, Val) ((Type) (Val))
#   define YY_REINTERPRET_CAST(Type, Val) ((Type) (Val))
#  endif
# endif
# ifndef YY_NULLPTR
#  if defined __cplusplus
#   if 201103L <= __cplusplus
#    define YY_NULLPTR nullptr
#   else
#    define YY_NULLPTR 0
#   endif
#  else
#   define YY_NULLPTR ((void*)0)
#  endif
# endif

/* Use api.header.include to #include this header
   instead of duplicating it here.  */
#ifndef YY_YY_Y_TAB_H_INCLUDED
# define YY_YY_Y_TAB_H_INCLUDED
/* Debug traces.  */
#ifndef YYDEBUG
# define YYDEBUG 0
#endif
#if YYDEBUG
extern int yydebug;
#endif

/* Token kinds.  */
#ifndef YYTOKENTYPE
# define YYTOKENTYPE
  enum yytokentype
  {
    YYEMPTY = -2,
    YYEOF = 0,                     /* "end of file"  */
    YYerror = 256,                 /* error  */
    YYUNDEF = 257,                 /* "invalid token"  */
    Name = 258,                    /* Name  */
    Number = 259,                  /* Number  */
    String = 260,                  /* String  */
    BitString = 261,               /* BitString  */
    Rawline = 262,                 /* Rawline  */
    INCLUDE = 263,                 /* INCLUDE  */
    DEFINE = 264,                  /* DEFINE  */
    ENDDEFINE = 265,               /* ENDDEFINE  */
    USE = 266,                     /* USE  */
    AVAID = 267,                   /* AVAID  */
    BIN15 = 268,                   /* BIN15  */
    BIN31 = 269,                   /* BIN31  */
    BIT = 270,                     /* BIT  */
    BYTE = 271,                    /* BYTE  */
    CHARACTER = 272,               /* CHARACTER  */
    ENTITY = 273,                  /* ENTITY  */
    FATWORD = 274,                 /* FATWORD  */
    OBJID = 275,                   /* OBJID  */
    REGID = 276,                   /* REGID  */
    VARSTRING = 277,               /* VARSTRING  */
    WORDS = 278,                   /* WORDS  */
    A = 279,                       /* A  */
    O = 280,                       /* O  */
    R = 281,                       /* R  */
    OR = 282,                      /* OR  */
    XOR = 283,                     /* XOR  */
    AND = 284,                     /* AND  */
    ADD = 285,                     /* ADD  */
    SUB = 286,                     /* SUB  */
    MUL = 287,                     /* MUL  */
    DIV = 288,                     /* DIV  */
    MOD = 289,                     /* MOD  */
    UMINUS = 290,                  /* UMINUS  */
    NOT = 291                      /* NOT  */
  };
  typedef enum yytokentype yytoken_kind_t;
#endif
/* Token kinds.  */
#define YYEMPTY -2
#define YYEOF 0
#define YYerror 256
#define YYUNDEF 257
#define Name 258
#define Number 259
#define String 260
#define BitString 261
#define Rawline 262
#define INCLUDE 263
#define DEFINE 264
#define ENDDEFINE 265
#define USE 266
#define AVAID 267
#define BIN15 268
#define BIN31 269
#define BIT 270
#define BYTE 271
#define CHARACTER 272
#define ENTITY 273
#define FATWORD 274
#define OBJID 275
#define REGID 276
#define VARSTRING 277
#define WORDS 278
#define A 279
#define O 280
#define R 281
#define OR 282
#define XOR 283
#define AND 284
#define ADD 285
#define SUB 286
#define MUL 287
#define DIV 288
#define MOD 289
#define UMINUS 290
#define NOT 291

/* Value type.  */
#if ! defined YYSTYPE && ! defined YYSTYPE_IS_DECLARED
typedef int YYSTYPE;
# define YYSTYPE_IS_TRIVIAL 1
# define YYSTYPE_IS_DECLARED 1
#endif


extern YYSTYPE yylval;


int yyparse (void);


#endif /* !YY_YY_Y_TAB_H_INCLUDED  */
/* Symbol kind.  */
enum yysymbol_kind_t
{
  YYSYMBOL_YYEMPTY = -2,
  YYSYMBOL_YYEOF = 0,                      /* "end of file"  */
  YYSYMBOL_YYerror = 1,                    /* error  */
  YYSYMBOL_YYUNDEF = 2,                    /* "invalid token"  */
  YYSYMBOL_Name = 3,                       /* Name  */
  YYSYMBOL_Number = 4,                     /* Number  */
  YYSYMBOL_String = 5,                     /* String  */
  YYSYMBOL_BitString = 6,                  /* BitString  */
  YYSYMBOL_Rawline = 7,                    /* Rawline  */
  YYSYMBOL_INCLUDE = 8,                    /* INCLUDE  */
  YYSYMBOL_DEFINE = 9,                     /* DEFINE  */
  YYSYMBOL_ENDDEFINE = 10,                 /* ENDDEFINE  */
  YYSYMBOL_USE = 11,                       /* USE  */
  YYSYMBOL_AVAID = 12,                     /* AVAID  */
  YYSYMBOL_BIN15 = 13,                     /* BIN15  */
  YYSYMBOL_BIN31 = 14,                     /* BIN31  */
  YYSYMBOL_BIT = 15,                       /* BIT  */
  YYSYMBOL_BYTE = 16,                      /* BYTE  */
  YYSYMBOL_CHARACTER = 17,                 /* CHARACTER  */
  YYSYMBOL_ENTITY = 18,                    /* ENTITY  */
  YYSYMBOL_FATWORD = 19,                   /* FATWORD  */
  YYSYMBOL_OBJID = 20,                     /* OBJID  */
  YYSYMBOL_REGID = 21,                     /* REGID  */
  YYSYMBOL_VARSTRING = 22,                 /* VARSTRING  */
  YYSYMBOL_WORDS = 23,                     /* WORDS  */
  YYSYMBOL_A = 24,                         /* A  */
  YYSYMBOL_O = 25,                         /* O  */
  YYSYMBOL_R = 26,                         /* R  */
  YYSYMBOL_OR = 27,                        /* OR  */
  YYSYMBOL_XOR = 28,                       /* XOR  */
  YYSYMBOL_AND = 29,                       /* AND  */
  YYSYMBOL_ADD = 30,                       /* ADD  */
  YYSYMBOL_SUB = 31,                       /* SUB  */
  YYSYMBOL_MUL = 32,                       /* MUL  */
  YYSYMBOL_DIV = 33,                       /* DIV  */
  YYSYMBOL_MOD = 34,                       /* MOD  */
  YYSYMBOL_UMINUS = 35,                    /* UMINUS  */
  YYSYMBOL_NOT = 36,                       /* NOT  */
  YYSYMBOL_37_ = 37,                       /* '='  */
  YYSYMBOL_38_ = 38,                       /* '#'  */
  YYSYMBOL_39_ = 39,                       /* ':'  */
  YYSYMBOL_40_ = 40,                       /* '('  */
  YYSYMBOL_41_ = 41,                       /* ')'  */
  YYSYMBOL_42_ = 42,                       /* '{'  */
  YYSYMBOL_43_ = 43,                       /* '}'  */
  YYSYMBOL_44_ = 44,                       /* ','  */
  YYSYMBOL_YYACCEPT = 45,                  /* $accept  */
  YYSYMBOL_statementList = 46,             /* statementList  */
  YYSYMBOL_statement = 47,                 /* statement  */
  YYSYMBOL_rawStatement = 48,              /* rawStatement  */
  YYSYMBOL_assignmentStatement = 49,       /* assignmentStatement  */
  YYSYMBOL_includeStatement = 50,          /* includeStatement  */
  YYSYMBOL_defineStatement = 51,           /* defineStatement  */
  YYSYMBOL_fieldList = 52,                 /* fieldList  */
  YYSYMBOL_field = 53,                     /* field  */
  YYSYMBOL_basicField = 54,                /* basicField  */
  YYSYMBOL_fieldType = 55,                 /* fieldType  */
  YYSYMBOL_objectUseStatement = 56,        /* objectUseStatement  */
  YYSYMBOL_objectTail = 57,                /* objectTail  */
  YYSYMBOL_properties = 58,                /* properties  */
  YYSYMBOL_property = 59,                  /* property  */
  YYSYMBOL_exprList = 60,                  /* exprList  */
  YYSYMBOL_expr = 61                       /* expr  */
};
typedef enum yysymbol_kind_t yysymbol_kind_t;




#ifdef short
# undef short
#endif

/* On compilers that do not define __PTRDIFF_MAX__ etc., make sure
   <limits.h> and (if available) <stdint.h> are included
   so that the code can choose integer types of a good width.  */

#ifndef __PTRDIFF_MAX__
# include <limits.h> /* INFRINGES ON USER NAME SPACE */
# if defined __STDC_VERSION__ && 199901 <= __STDC_VERSION__
#  include <stdint.h> /* INFRINGES ON USER NAME SPACE */
#  define YY_STDINT_H
# endif
#endif

/* Narrow types that promote to a signed type and that can represent a
   signed or unsigned integer of at least N bits.  In tables they can
   save space and decrease cache pressure.  Promoting to a signed type
   helps avoid bugs in integer arithmetic.  */

#ifdef __INT_LEAST8_MAX__
typedef __INT_LEAST8_TYPE__ yytype_int8;
#elif defined YY_STDINT_H
typedef int_least8_t yytype_int8;
#else
typedef signed char yytype_int8;
#endif

#ifdef __INT_LEAST16_MAX__
typedef __INT_LEAST16_TYPE__ yytype_int16;
#elif defined YY_STDINT_H
typedef int_least16_t yytype_int16;
#else
typedef short yytype_int16;
#endif

/* Work around bug in HP-UX 11.23, which defines these macros
   incorrectly for preprocessor constants.  This workaround can likely
   be removed in 2023, as HPE has promised support for HP-UX 11.23
   (aka HP-UX 11i v2) only through the end of 2022; see Table 2 of
   <https://h20195.www2.hpe.com/V2/getpdf.aspx/4AA4-7673ENW.pdf>.  */
#ifdef __hpux
# undef UINT_LEAST8_MAX
# undef UINT_LEAST16_MAX
# define UINT_LEAST8_MAX 255
# define UINT_LEAST16_MAX 65535
#endif

#if defined __UINT_LEAST8_MAX__ && __UINT_LEAST8_MAX__ <= __INT_MAX__
typedef __UINT_LEAST8_TYPE__ yytype_uint8;
#elif (!defined __UINT_LEAST8_MAX__ && defined YY_STDINT_H \
       && UINT_LEAST8_MAX <= INT_MAX)
typedef uint_least8_t yytype_uint8;
#elif !defined __UINT_LEAST8_MAX__ && UCHAR_MAX <= INT_MAX
typedef unsigned char yytype_uint8;
#else
typedef short yytype_uint8;
#endif

#if defined __UINT_LEAST16_MAX__ && __UINT_LEAST16_MAX__ <= __INT_MAX__
typedef __UINT_LEAST16_TYPE__ yytype_uint16;
#elif (!defined __UINT_LEAST16_MAX__ && defined YY_STDINT_H \
       && UINT_LEAST16_MAX <= INT_MAX)
typedef uint_least16_t yytype_uint16;
#elif !defined __UINT_LEAST16_MAX__ && USHRT_MAX <= INT_MAX
typedef unsigned short yytype_uint16;
#else
typedef int yytype_uint16;
#endif

#ifndef YYPTRDIFF_T
# if defined __PTRDIFF_TYPE__ && defined __PTRDIFF_MAX__
#  define YYPTRDIFF_T __PTRDIFF_TYPE__
#  define YYPTRDIFF_MAXIMUM __PTRDIFF_MAX__
# elif defined PTRDIFF_MAX
#  ifndef ptrdiff_t
#   include <stddef.h> /* INFRINGES ON USER NAME SPACE */
#  endif
#  define YYPTRDIFF_T ptrdiff_t
#  define YYPTRDIFF_MAXIMUM PTRDIFF_MAX
# else
#  define YYPTRDIFF_T long
#  define YYPTRDIFF_MAXIMUM LONG_MAX
# endif
#endif

#ifndef YYSIZE_T
# ifdef __SIZE_TYPE__
#  define YYSIZE_T __SIZE_TYPE__
# elif defined size_t
#  define YYSIZE_T size_t
# elif defined __STDC_VERSION__ && 199901 <= __STDC_VERSION__
#  include <stddef.h> /* INFRINGES ON USER NAME SPACE */
#  define YYSIZE_T size_t
# else
#  define YYSIZE_T unsigned
# endif
#endif

#define YYSIZE_MAXIMUM                                  \
  YY_CAST (YYPTRDIFF_T,                                 \
           (YYPTRDIFF_MAXIMUM < YY_CAST (YYSIZE_T, -1)  \
            ? YYPTRDIFF_MAXIMUM                         \
            : YY_CAST (YYSIZE_T, -1)))

#define YYSIZEOF(X) YY_CAST (YYPTRDIFF_T, sizeof (X))


/* Stored state numbers (used for stacks). */
typedef yytype_int8 yy_state_t;

/* State numbers in computations.  */
typedef int yy_state_fast_t;

#ifndef YY_
# if defined YYENABLE_NLS && YYENABLE_NLS
#  if ENABLE_NLS
#   include <libintl.h> /* INFRINGES ON USER NAME SPACE */
#   define YY_(Msgid) dgettext ("bison-runtime", Msgid)
#  endif
# endif
# ifndef YY_
#  define YY_(Msgid) Msgid
# endif
#endif


#ifndef YY_ATTRIBUTE_PURE
# if defined __GNUC__ && 2 < __GNUC__ + (96 <= __GNUC_MINOR__)
#  define YY_ATTRIBUTE_PURE __attribute__ ((__pure__))
# else
#  define YY_ATTRIBUTE_PURE
# endif
#endif

#ifndef YY_ATTRIBUTE_UNUSED
# if defined __GNUC__ && 2 < __GNUC__ + (7 <= __GNUC_MINOR__)
#  define YY_ATTRIBUTE_UNUSED __attribute__ ((__unused__))
# else
#  define YY_ATTRIBUTE_UNUSED
# endif
#endif

/* Suppress unused-variable warnings by "using" E.  */
#if ! defined lint || defined __GNUC__
# define YY_USE(E) ((void) (E))
#else
# define YY_USE(E) /* empty */
#endif

/* Suppress an incorrect diagnostic about yylval being uninitialized.  */
#if defined __GNUC__ && ! defined __ICC && 406 <= __GNUC__ * 100 + __GNUC_MINOR__
# if __GNUC__ * 100 + __GNUC_MINOR__ < 407
#  define YY_IGNORE_MAYBE_UNINITIALIZED_BEGIN                           \
    _Pragma ("GCC diagnostic push")                                     \
    _Pragma ("GCC diagnostic ignored \"-Wuninitialized\"")
# else
#  define YY_IGNORE_MAYBE_UNINITIALIZED_BEGIN                           \
    _Pragma ("GCC diagnostic push")                                     \
    _Pragma ("GCC diagnostic ignored \"-Wuninitialized\"")              \
    _Pragma ("GCC diagnostic ignored \"-Wmaybe-uninitialized\"")
# endif
# define YY_IGNORE_MAYBE_UNINITIALIZED_END      \
    _Pragma ("GCC diagnostic pop")
#else
# define YY_INITIAL_VALUE(Value) Value
#endif
#ifndef YY_IGNORE_MAYBE_UNINITIALIZED_BEGIN
# define YY_IGNORE_MAYBE_UNINITIALIZED_BEGIN
# define YY_IGNORE_MAYBE_UNINITIALIZED_END
#endif
#ifndef YY_INITIAL_VALUE
# define YY_INITIAL_VALUE(Value) /* Nothing. */
#endif

#if defined __cplusplus && defined __GNUC__ && ! defined __ICC && 6 <= __GNUC__
# define YY_IGNORE_USELESS_CAST_BEGIN                          \
    _Pragma ("GCC diagnostic push")                            \
    _Pragma ("GCC diagnostic ignored \"-Wuseless-cast\"")
# define YY_IGNORE_USELESS_CAST_END            \
    _Pragma ("GCC diagnostic pop")
#endif
#ifndef YY_IGNORE_USELESS_CAST_BEGIN
# define YY_IGNORE_USELESS_CAST_BEGIN
# define YY_IGNORE_USELESS_CAST_END
#endif


#define YY_ASSERT(E) ((void) (0 && (E)))

#if !defined yyoverflow

/* The parser invokes alloca or malloc; define the necessary symbols.  */

# ifdef YYSTACK_USE_ALLOCA
#  if YYSTACK_USE_ALLOCA
#   ifdef __GNUC__
#    define YYSTACK_ALLOC __builtin_alloca
#   elif defined __BUILTIN_VA_ARG_INCR
#    include <alloca.h> /* INFRINGES ON USER NAME SPACE */
#   elif defined _AIX
#    define YYSTACK_ALLOC __alloca
#   elif defined _MSC_VER
#    include <malloc.h> /* INFRINGES ON USER NAME SPACE */
#    define alloca _alloca
#   else
#    define YYSTACK_ALLOC alloca
#    if ! defined _ALLOCA_H && ! defined EXIT_SUCCESS
#     include <stdlib.h> /* INFRINGES ON USER NAME SPACE */
      /* Use EXIT_SUCCESS as a witness for stdlib.h.  */
#     ifndef EXIT_SUCCESS
#      define EXIT_SUCCESS 0
#     endif
#    endif
#   endif
#  endif
# endif

# ifdef YYSTACK_ALLOC
   /* Pacify GCC's 'empty if-body' warning.  */
#  define YYSTACK_FREE(Ptr) do { /* empty */; } while (0)
#  ifndef YYSTACK_ALLOC_MAXIMUM
    /* The OS might guarantee only one guard page at the bottom of the stack,
       and a page size can be as small as 4096 bytes.  So we cannot safely
       invoke alloca (N) if N exceeds 4096.  Use a slightly smaller number
       to allow for a few compiler-allocated temporary stack slots.  */
#   define YYSTACK_ALLOC_MAXIMUM 4032 /* reasonable circa 2006 */
#  endif
# else
#  define YYSTACK_ALLOC YYMALLOC
#  define YYSTACK_FREE YYFREE
#  ifndef YYSTACK_ALLOC_MAXIMUM
#   define YYSTACK_ALLOC_MAXIMUM YYSIZE_MAXIMUM
#  endif
#  if (defined __cplusplus && ! defined EXIT_SUCCESS \
       && ! ((defined YYMALLOC || defined malloc) \
             && (defined YYFREE || defined free)))
#   include <stdlib.h> /* INFRINGES ON USER NAME SPACE */
#   ifndef EXIT_SUCCESS
#    define EXIT_SUCCESS 0
#   endif
#  endif
#  ifndef YYMALLOC
#   define YYMALLOC malloc
#   if ! defined malloc && ! defined EXIT_SUCCESS
void *malloc (YYSIZE_T); /* INFRINGES ON USER NAME SPACE */
#   endif
#  endif
#  ifndef YYFREE
#   define YYFREE free
#   if ! defined free && ! defined EXIT_SUCCESS
void free (void *); /* INFRINGES ON USER NAME SPACE */
#   endif
#  endif
# endif
#endif /* !defined yyoverflow */

#if (! defined yyoverflow \
     && (! defined __cplusplus \
         || (defined YYSTYPE_IS_TRIVIAL && YYSTYPE_IS_TRIVIAL)))

/* A type that is properly aligned for any stack member.  */
union yyalloc
{
  yy_state_t yyss_alloc;
  YYSTYPE yyvs_alloc;
};

/* The size of the maximum gap between one aligned stack and the next.  */
# define YYSTACK_GAP_MAXIMUM (YYSIZEOF (union yyalloc) - 1)

/* The size of an array large to enough to hold all stacks, each with
   N elements.  */
# define YYSTACK_BYTES(N) \
     ((N) * (YYSIZEOF (yy_state_t) + YYSIZEOF (YYSTYPE)) \
      + YYSTACK_GAP_MAXIMUM)

# define YYCOPY_NEEDED 1

/* Relocate STACK from its old location to the new one.  The
   local variables YYSIZE and YYSTACKSIZE give the old and new number of
   elements in the stack, and YYPTR gives the new location of the
   stack.  Advance YYPTR to a properly aligned location for the next
   stack.  */
# define YYSTACK_RELOCATE(Stack_alloc, Stack)                           \
    do                                                                  \
      {                                                                 \
        YYPTRDIFF_T yynewbytes;                                         \
        YYCOPY (&yyptr->Stack_alloc, Stack, yysize);                    \
        Stack = &yyptr->Stack_alloc;                                    \
        yynewbytes = yystacksize * YYSIZEOF (*Stack) + YYSTACK_GAP_MAXIMUM; \
        yyptr += yynewbytes / YYSIZEOF (*yyptr);                        \
      }                                                                 \
    while (0)

#endif

#if defined YYCOPY_NEEDED && YYCOPY_NEEDED
/* Copy COUNT objects from SRC to DST.  The source and destination do
   not overlap.  */
# ifndef YYCOPY
#  if defined __GNUC__ && 1 < __GNUC__
#   define YYCOPY(Dst, Src, Count) \
      __builtin_memcpy (Dst, Src, YY_CAST (YYSIZE_T, (Count)) * sizeof (*(Src)))
#  else
#   define YYCOPY(Dst, Src, Count)              \
      do                                        \
        {                                       \
          YYPTRDIFF_T yyi;                      \
          for (yyi = 0; yyi < (Count); yyi++)   \
            (Dst)[yyi] = (Src)[yyi];            \
        }                                       \
      while (0)
#  endif
# endif
#endif /* !YYCOPY_NEEDED */

/* YYFINAL -- State number of the termination state.  */
#define YYFINAL  27
/* YYLAST -- Last index in YYTABLE.  */
#define YYLAST   156

/* YYNTOKENS -- Number of terminals.  */
#define YYNTOKENS  45
/* YYNNTS -- Number of nonterminals.  */
#define YYNNTS  17
/* YYNRULES -- Number of rules.  */
#define YYNRULES  60
/* YYNSTATES -- Number of states.  */
#define YYNSTATES  105

/* YYMAXUTOK -- Last valid token kind.  */
#define YYMAXUTOK   291


/* YYTRANSLATE(TOKEN-NUM) -- Symbol number corresponding to TOKEN-NUM
   as returned by yylex, with out-of-bounds checking.  */
#define YYTRANSLATE(YYX)                                \
  (0 <= (YYX) && (YYX) <= YYMAXUTOK                     \
   ? YY_CAST (yysymbol_kind_t, yytranslate[YYX])        \
   : YYSYMBOL_YYUNDEF)

/* YYTRANSLATE[TOKEN-NUM] -- Symbol number corresponding to TOKEN-NUM
   as returned by yylex.  */
static const yytype_int8 yytranslate[] =
{
       0,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,    38,     2,     2,     2,     2,
      40,    41,     2,     2,    44,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,    39,     2,
       2,    37,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,    42,     2,    43,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     1,     2,     3,     4,
       5,     6,     7,     8,     9,    10,    11,    12,    13,    14,
      15,    16,    17,    18,    19,    20,    21,    22,    23,    24,
      25,    26,    27,    28,    29,    30,    31,    32,    33,    34,
      35,    36
};

#if YYDEBUG
/* YYRLINE[YYN] -- Source line where rule number YYN was defined.  */
static const yytype_uint8 yyrline[] =
{
       0,    23,    23,    24,    28,    29,    30,    31,    32,    36,
      43,    50,    57,    61,    68,    72,    79,    83,    90,    94,
      98,   102,   109,   110,   111,   112,   113,   114,   115,   116,
     117,   118,   119,   120,   124,   128,   135,   139,   146,   150,
     157,   164,   168,   175,   179,   183,   187,   191,   195,   199,
     203,   207,   211,   215,   219,   223,   227,   231,   235,   239,
     243
};
#endif

/** Accessing symbol of state STATE.  */
#define YY_ACCESSING_SYMBOL(State) YY_CAST (yysymbol_kind_t, yystos[State])

#if YYDEBUG || 0
/* The user-facing name of the symbol whose (internal) number is
   YYSYMBOL.  No bounds checking.  */
static const char *yysymbol_name (yysymbol_kind_t yysymbol) YY_ATTRIBUTE_UNUSED;

/* YYTNAME[SYMBOL-NUM] -- String name of the symbol SYMBOL-NUM.
   First, the terminals, then, starting at YYNTOKENS, nonterminals.  */
static const char *const yytname[] =
{
  "\"end of file\"", "error", "\"invalid token\"", "Name", "Number",
  "String", "BitString", "Rawline", "INCLUDE", "DEFINE", "ENDDEFINE",
  "USE", "AVAID", "BIN15", "BIN31", "BIT", "BYTE", "CHARACTER", "ENTITY",
  "FATWORD", "OBJID", "REGID", "VARSTRING", "WORDS", "A", "O", "R", "OR",
  "XOR", "AND", "ADD", "SUB", "MUL", "DIV", "MOD", "UMINUS", "NOT", "'='",
  "'#'", "':'", "'('", "')'", "'{'", "'}'", "','", "$accept",
  "statementList", "statement", "rawStatement", "assignmentStatement",
  "includeStatement", "defineStatement", "fieldList", "field",
  "basicField", "fieldType", "objectUseStatement", "objectTail",
  "properties", "property", "exprList", "expr", YY_NULLPTR
};

static const char *
yysymbol_name (yysymbol_kind_t yysymbol)
{
  return yytname[yysymbol];
}
#endif

#define YYPACT_NINF (-91)

#define yypact_value_is_default(Yyn) \
  ((Yyn) == YYPACT_NINF)

#define YYTABLE_NINF (-1)

#define yytable_value_is_error(Yyn) \
  0

/* YYPACT[STATE-NUM] -- Index in YYTABLE of the portion describing
   STATE-NUM.  */
static const yytype_int16 yypact[] =
{
      56,   -31,   -91,     3,    21,    11,   137,   -91,   -91,   -91,
     -91,   -91,   -91,    21,   -91,   -91,   -91,   -91,   -91,    21,
      21,    21,    21,    21,    21,    43,     7,   -91,   -91,   122,
     122,   122,   122,   -91,   -91,    68,    18,    21,    21,    21,
      21,    21,    21,    21,    21,   -35,    21,    19,   -91,   -91,
     -28,   -91,    28,    20,   -91,   -91,    58,    74,    88,   109,
     109,   -91,   -91,   -91,   -91,    51,    -7,    -2,   -91,   113,
      21,   -91,   -91,   -91,    19,    21,   -91,   -91,   -91,   -91,
     -91,   -91,   -91,   -91,   -91,   -91,   -91,   -91,   -91,   -91,
      13,    83,     0,     9,   122,    21,    12,   -91,    21,     9,
     113,   122,    17,    21,     9
};

/* YYDEFACT[STATE-NUM] -- Default reduction number in state STATE-NUM.
   Performed when YYTABLE does not specify something else to do.  Zero
   means the default is an error.  */
static const yytype_int8 yydefact[] =
{
       0,     0,     9,     0,     0,     0,     0,     2,     8,     4,
       5,     6,     7,     0,    11,    43,    44,    45,    46,     0,
       0,     0,     0,     0,     0,     0,     0,     1,     3,    10,
      50,    51,    52,    48,    49,     0,     0,     0,     0,     0,
       0,     0,     0,     0,     0,     0,     0,     0,    35,    47,
       0,    13,     0,     0,    14,    16,    59,    60,    58,    53,
      54,    55,    56,    57,    34,     0,     0,     0,    38,     0,
       0,    17,    12,    15,     0,     0,    37,    39,    29,    23,
      24,    25,    32,    22,    31,    30,    28,    27,    33,    26,
      18,     0,     0,    40,    41,     0,     0,    36,     0,    20,
       0,    42,    19,     0,    21
};

/* YYPGOTO[NTERM-NUM].  */
static const yytype_int8 yypgoto[] =
{
     -91,   -91,    49,   -91,   -91,   -91,   -91,   -91,    15,     8,
     -38,   -91,    24,    64,   -63,   -90,    -4
};

/* YYDEFGOTO[NTERM-NUM].  */
static const yytype_int8 yydefgoto[] =
{
       0,     6,     7,     8,     9,    10,    11,    53,    54,    55,
      90,    12,    48,    67,    68,    93,    94
};

/* YYTABLE[YYPACT[STATE-NUM]] -- What to do in state STATE-NUM.  If
   positive, shift that token.  If negative, reduce the rule whose
   number is the opposite.  If YYTABLE_NINF, syntax error.  */
static const yytype_int8 yytable[] =
{
      25,    66,    46,    66,    77,    99,    13,    47,    14,    29,
      45,    69,    70,   104,    26,    30,    31,    32,    33,    34,
      35,    50,    66,    50,    15,    16,    17,    18,    51,    77,
      72,    50,    75,    56,    57,    58,    59,    60,    61,    62,
      63,    76,    65,    97,    46,    19,    20,    21,    36,    47,
      95,   100,    22,    98,   103,    28,    52,    23,    52,     1,
      71,    24,   102,     2,     3,     4,    91,     5,    73,    64,
      37,    38,    39,    40,    41,    42,    43,    44,    37,    38,
      39,    40,    41,    42,    43,    44,    38,    39,    40,    41,
      42,    43,    44,    74,   101,    37,    38,    39,    40,    41,
      42,    43,    44,    39,    40,    41,    42,    43,    44,    49,
      37,    38,    39,    40,    41,    42,    43,    44,    40,    41,
      42,    43,    44,     0,    96,    78,    79,    80,    81,    82,
      83,    84,    85,    86,    87,    88,    89,    27,    92,     0,
       1,    42,    43,    44,     2,     3,     4,     0,     5,    37,
      38,    39,    40,    41,    42,    43,    44
};

static const yytype_int8 yycheck[] =
{
       4,     3,    37,     3,    67,    95,    37,    42,     5,    13,
       3,    39,    40,   103,     3,    19,    20,    21,    22,    23,
      24,     3,     3,     3,     3,     4,     5,     6,    10,    92,
      10,     3,    39,    37,    38,    39,    40,    41,    42,    43,
      44,    43,    46,    43,    37,    24,    25,    26,     5,    42,
      37,    39,    31,    44,    37,     6,    38,    36,    38,     3,
      52,    40,   100,     7,     8,     9,    70,    11,    53,    45,
      27,    28,    29,    30,    31,    32,    33,    34,    27,    28,
      29,    30,    31,    32,    33,    34,    28,    29,    30,    31,
      32,    33,    34,    42,    98,    27,    28,    29,    30,    31,
      32,    33,    34,    29,    30,    31,    32,    33,    34,    41,
      27,    28,    29,    30,    31,    32,    33,    34,    30,    31,
      32,    33,    34,    -1,    41,    12,    13,    14,    15,    16,
      17,    18,    19,    20,    21,    22,    23,     0,    74,    -1,
       3,    32,    33,    34,     7,     8,     9,    -1,    11,    27,
      28,    29,    30,    31,    32,    33,    34
};

/* YYSTOS[STATE-NUM] -- The symbol kind of the accessing symbol of
   state STATE-NUM.  */
static const yytype_int8 yystos[] =
{
       0,     3,     7,     8,     9,    11,    46,    47,    48,    49,
      50,    51,    56,    37,     5,     3,     4,     5,     6,    24,
      25,    26,    31,    36,    40,    61,     3,     0,    47,    61,
      61,    61,    61,    61,    61,    61,     5,    27,    28,    29,
      30,    31,    32,    33,    34,     3,    37,    42,    57,    41,
       3,    10,    38,    52,    53,    54,    61,    61,    61,    61,
      61,    61,    61,    61,    57,    61,     3,    58,    59,    39,
      40,    54,    10,    53,    42,    39,    43,    59,    12,    13,
      14,    15,    16,    17,    18,    19,    20,    21,    22,    23,
      55,    61,    58,    60,    61,    37,    41,    43,    44,    60,
      39,    61,    55,    37,    60
};

/* YYR1[RULE-NUM] -- Symbol kind of the left-hand side of rule RULE-NUM.  */
static const yytype_int8 yyr1[] =
{
       0,    45,    46,    46,    47,    47,    47,    47,    47,    48,
      49,    50,    51,    51,    52,    52,    53,    53,    54,    54,
      54,    54,    55,    55,    55,    55,    55,    55,    55,    55,
      55,    55,    55,    55,    56,    56,    57,    57,    58,    58,
      59,    60,    60,    61,    61,    61,    61,    61,    61,    61,
      61,    61,    61,    61,    61,    61,    61,    61,    61,    61,
      61
};

/* YYR2[RULE-NUM] -- Number of symbols on the right-hand side of rule RULE-NUM.  */
static const yytype_int8 yyr2[] =
{
       0,     2,     1,     2,     1,     1,     1,     1,     1,     1,
       3,     2,     5,     4,     1,     2,     1,     2,     3,     6,
       5,     8,     1,     1,     1,     1,     1,     1,     1,     1,
       1,     1,     1,     1,     4,     3,     5,     3,     1,     2,
       3,     1,     3,     1,     1,     1,     1,     3,     2,     2,
       2,     2,     2,     3,     3,     3,     3,     3,     3,     3,
       3
};


enum { YYENOMEM = -2 };

#define yyerrok         (yyerrstatus = 0)
#define yyclearin       (yychar = YYEMPTY)

#define YYACCEPT        goto yyacceptlab
#define YYABORT         goto yyabortlab
#define YYERROR         goto yyerrorlab
#define YYNOMEM         goto yyexhaustedlab


#define YYRECOVERING()  (!!yyerrstatus)

#define YYBACKUP(Token, Value)                                    \
  do                                                              \
    if (yychar == YYEMPTY)                                        \
      {                                                           \
        yychar = (Token);                                         \
        yylval = (Value);                                         \
        YYPOPSTACK (yylen);                                       \
        yystate = *yyssp;                                         \
        goto yybackup;                                            \
      }                                                           \
    else                                                          \
      {                                                           \
        yyerror (YY_("syntax error: cannot back up")); \
        YYERROR;                                                  \
      }                                                           \
  while (0)

/* Backward compatibility with an undocumented macro.
   Use YYerror or YYUNDEF. */
#define YYERRCODE YYUNDEF


/* Enable debugging if requested.  */
#if YYDEBUG

# ifndef YYFPRINTF
#  include <stdio.h> /* INFRINGES ON USER NAME SPACE */
#  define YYFPRINTF fprintf
# endif

# define YYDPRINTF(Args)                        \
do {                                            \
  if (yydebug)                                  \
    YYFPRINTF Args;                             \
} while (0)




# define YY_SYMBOL_PRINT(Title, Kind, Value, Location)                    \
do {                                                                      \
  if (yydebug)                                                            \
    {                                                                     \
      YYFPRINTF (stderr, "%s ", Title);                                   \
      yy_symbol_print (stderr,                                            \
                  Kind, Value); \
      YYFPRINTF (stderr, "\n");                                           \
    }                                                                     \
} while (0)


/*-----------------------------------.
| Print this symbol's value on YYO.  |
`-----------------------------------*/

static void
yy_symbol_value_print (FILE *yyo,
                       yysymbol_kind_t yykind, YYSTYPE const * const yyvaluep)
{
  FILE *yyoutput = yyo;
  YY_USE (yyoutput);
  if (!yyvaluep)
    return;
  YY_IGNORE_MAYBE_UNINITIALIZED_BEGIN
  YY_USE (yykind);
  YY_IGNORE_MAYBE_UNINITIALIZED_END
}


/*---------------------------.
| Print this symbol on YYO.  |
`---------------------------*/

static void
yy_symbol_print (FILE *yyo,
                 yysymbol_kind_t yykind, YYSTYPE const * const yyvaluep)
{
  YYFPRINTF (yyo, "%s %s (",
             yykind < YYNTOKENS ? "token" : "nterm", yysymbol_name (yykind));

  yy_symbol_value_print (yyo, yykind, yyvaluep);
  YYFPRINTF (yyo, ")");
}

/*------------------------------------------------------------------.
| yy_stack_print -- Print the state stack from its BOTTOM up to its |
| TOP (included).                                                   |
`------------------------------------------------------------------*/

static void
yy_stack_print (yy_state_t *yybottom, yy_state_t *yytop)
{
  YYFPRINTF (stderr, "Stack now");
  for (; yybottom <= yytop; yybottom++)
    {
      int yybot = *yybottom;
      YYFPRINTF (stderr, " %d", yybot);
    }
  YYFPRINTF (stderr, "\n");
}

# define YY_STACK_PRINT(Bottom, Top)                            \
do {                                                            \
  if (yydebug)                                                  \
    yy_stack_print ((Bottom), (Top));                           \
} while (0)


/*------------------------------------------------.
| Report that the YYRULE is going to be reduced.  |
`------------------------------------------------*/

static void
yy_reduce_print (yy_state_t *yyssp, YYSTYPE *yyvsp,
                 int yyrule)
{
  int yylno = yyrline[yyrule];
  int yynrhs = yyr2[yyrule];
  int yyi;
  YYFPRINTF (stderr, "Reducing stack by rule %d (line %d):\n",
             yyrule - 1, yylno);
  /* The symbols being reduced.  */
  for (yyi = 0; yyi < yynrhs; yyi++)
    {
      YYFPRINTF (stderr, "   $%d = ", yyi + 1);
      yy_symbol_print (stderr,
                       YY_ACCESSING_SYMBOL (+yyssp[yyi + 1 - yynrhs]),
                       &yyvsp[(yyi + 1) - (yynrhs)]);
      YYFPRINTF (stderr, "\n");
    }
}

# define YY_REDUCE_PRINT(Rule)          \
do {                                    \
  if (yydebug)                          \
    yy_reduce_print (yyssp, yyvsp, Rule); \
} while (0)

/* Nonzero means print parse trace.  It is left uninitialized so that
   multiple parsers can coexist.  */
int yydebug;
#else /* !YYDEBUG */
# define YYDPRINTF(Args) ((void) 0)
# define YY_SYMBOL_PRINT(Title, Kind, Value, Location)
# define YY_STACK_PRINT(Bottom, Top)
# define YY_REDUCE_PRINT(Rule)
#endif /* !YYDEBUG */


/* YYINITDEPTH -- initial size of the parser's stacks.  */
#ifndef YYINITDEPTH
# define YYINITDEPTH 200
#endif

/* YYMAXDEPTH -- maximum size the stacks can grow to (effective only
   if the built-in stack extension method is used).

   Do not make this value too large; the results are undefined if
   YYSTACK_ALLOC_MAXIMUM < YYSTACK_BYTES (YYMAXDEPTH)
   evaluated with infinite-precision integer arithmetic.  */

#ifndef YYMAXDEPTH
# define YYMAXDEPTH 10000
#endif






/*-----------------------------------------------.
| Release the memory associated to this symbol.  |
`-----------------------------------------------*/

static void
yydestruct (const char *yymsg,
            yysymbol_kind_t yykind, YYSTYPE *yyvaluep)
{
  YY_USE (yyvaluep);
  if (!yymsg)
    yymsg = "Deleting";
  YY_SYMBOL_PRINT (yymsg, yykind, yyvaluep, yylocationp);

  YY_IGNORE_MAYBE_UNINITIALIZED_BEGIN
  YY_USE (yykind);
  YY_IGNORE_MAYBE_UNINITIALIZED_END
}


/* Lookahead token kind.  */
int yychar;

/* The semantic value of the lookahead symbol.  */
YYSTYPE yylval;
/* Number of syntax errors so far.  */
int yynerrs;




/*----------.
| yyparse.  |
`----------*/

int
yyparse (void)
{
    yy_state_fast_t yystate = 0;
    /* Number of tokens to shift before error messages enabled.  */
    int yyerrstatus = 0;

    /* Refer to the stacks through separate pointers, to allow yyoverflow
       to reallocate them elsewhere.  */

    /* Their size.  */
    YYPTRDIFF_T yystacksize = YYINITDEPTH;

    /* The state stack: array, bottom, top.  */
    yy_state_t yyssa[YYINITDEPTH];
    yy_state_t *yyss = yyssa;
    yy_state_t *yyssp = yyss;

    /* The semantic value stack: array, bottom, top.  */
    YYSTYPE yyvsa[YYINITDEPTH];
    YYSTYPE *yyvs = yyvsa;
    YYSTYPE *yyvsp = yyvs;

  int yyn;
  /* The return value of yyparse.  */
  int yyresult;
  /* Lookahead symbol kind.  */
  yysymbol_kind_t yytoken = YYSYMBOL_YYEMPTY;
  /* The variables used to return semantic value and location from the
     action routines.  */
  YYSTYPE yyval;



#define YYPOPSTACK(N)   (yyvsp -= (N), yyssp -= (N))

  /* The number of symbols on the RHS of the reduced rule.
     Keep to zero when no symbol should be popped.  */
  int yylen = 0;

  YYDPRINTF ((stderr, "Starting parse\n"));

  yychar = YYEMPTY; /* Cause a token to be read.  */

  goto yysetstate;


/*------------------------------------------------------------.
| yynewstate -- push a new state, which is found in yystate.  |
`------------------------------------------------------------*/
yynewstate:
  /* In all cases, when you get here, the value and location stacks
     have just been pushed.  So pushing a state here evens the stacks.  */
  yyssp++;


/*--------------------------------------------------------------------.
| yysetstate -- set current state (the top of the stack) to yystate.  |
`--------------------------------------------------------------------*/
yysetstate:
  YYDPRINTF ((stderr, "Entering state %d\n", yystate));
  YY_ASSERT (0 <= yystate && yystate < YYNSTATES);
  YY_IGNORE_USELESS_CAST_BEGIN
  *yyssp = YY_CAST (yy_state_t, yystate);
  YY_IGNORE_USELESS_CAST_END
  YY_STACK_PRINT (yyss, yyssp);

  if (yyss + yystacksize - 1 <= yyssp)
#if !defined yyoverflow && !defined YYSTACK_RELOCATE
    YYNOMEM;
#else
    {
      /* Get the current used size of the three stacks, in elements.  */
      YYPTRDIFF_T yysize = yyssp - yyss + 1;

# if defined yyoverflow
      {
        /* Give user a chance to reallocate the stack.  Use copies of
           these so that the &'s don't force the real ones into
           memory.  */
        yy_state_t *yyss1 = yyss;
        YYSTYPE *yyvs1 = yyvs;

        /* Each stack pointer address is followed by the size of the
           data in use in that stack, in bytes.  This used to be a
           conditional around just the two extra args, but that might
           be undefined if yyoverflow is a macro.  */
        yyoverflow (YY_("memory exhausted"),
                    &yyss1, yysize * YYSIZEOF (*yyssp),
                    &yyvs1, yysize * YYSIZEOF (*yyvsp),
                    &yystacksize);
        yyss = yyss1;
        yyvs = yyvs1;
      }
# else /* defined YYSTACK_RELOCATE */
      /* Extend the stack our own way.  */
      if (YYMAXDEPTH <= yystacksize)
        YYNOMEM;
      yystacksize *= 2;
      if (YYMAXDEPTH < yystacksize)
        yystacksize = YYMAXDEPTH;

      {
        yy_state_t *yyss1 = yyss;
        union yyalloc *yyptr =
          YY_CAST (union yyalloc *,
                   YYSTACK_ALLOC (YY_CAST (YYSIZE_T, YYSTACK_BYTES (yystacksize))));
        if (! yyptr)
          YYNOMEM;
        YYSTACK_RELOCATE (yyss_alloc, yyss);
        YYSTACK_RELOCATE (yyvs_alloc, yyvs);
#  undef YYSTACK_RELOCATE
        if (yyss1 != yyssa)
          YYSTACK_FREE (yyss1);
      }
# endif

      yyssp = yyss + yysize - 1;
      yyvsp = yyvs + yysize - 1;

      YY_IGNORE_USELESS_CAST_BEGIN
      YYDPRINTF ((stderr, "Stack size increased to %ld\n",
                  YY_CAST (long, yystacksize)));
      YY_IGNORE_USELESS_CAST_END

      if (yyss + yystacksize - 1 <= yyssp)
        YYABORT;
    }
#endif /* !defined yyoverflow && !defined YYSTACK_RELOCATE */


  if (yystate == YYFINAL)
    YYACCEPT;

  goto yybackup;


/*-----------.
| yybackup.  |
`-----------*/
yybackup:
  /* Do appropriate processing given the current state.  Read a
     lookahead token if we need one and don't already have one.  */

  /* First try to decide what to do without reference to lookahead token.  */
  yyn = yypact[yystate];
  if (yypact_value_is_default (yyn))
    goto yydefault;

  /* Not known => get a lookahead token if don't already have one.  */

  /* YYCHAR is either empty, or end-of-input, or a valid lookahead.  */
  if (yychar == YYEMPTY)
    {
      YYDPRINTF ((stderr, "Reading a token\n"));
      yychar = yylex ();
    }

  if (yychar <= YYEOF)
    {
      yychar = YYEOF;
      yytoken = YYSYMBOL_YYEOF;
      YYDPRINTF ((stderr, "Now at end of input.\n"));
    }
  else if (yychar == YYerror)
    {
      /* The scanner already issued an error message, process directly
         to error recovery.  But do not keep the error token as
         lookahead, it is too special and may lead us to an endless
         loop in error recovery. */
      yychar = YYUNDEF;
      yytoken = YYSYMBOL_YYerror;
      goto yyerrlab1;
    }
  else
    {
      yytoken = YYTRANSLATE (yychar);
      YY_SYMBOL_PRINT ("Next token is", yytoken, &yylval, &yylloc);
    }

  /* If the proper action on seeing token YYTOKEN is to reduce or to
     detect an error, take that action.  */
  yyn += yytoken;
  if (yyn < 0 || YYLAST < yyn || yycheck[yyn] != yytoken)
    goto yydefault;
  yyn = yytable[yyn];
  if (yyn <= 0)
    {
      if (yytable_value_is_error (yyn))
        goto yyerrlab;
      yyn = -yyn;
      goto yyreduce;
    }

  /* Count tokens shifted since error; after three, turn off error
     status.  */
  if (yyerrstatus)
    yyerrstatus--;

  /* Shift the lookahead token.  */
  YY_SYMBOL_PRINT ("Shifting", yytoken, &yylval, &yylloc);
  yystate = yyn;
  YY_IGNORE_MAYBE_UNINITIALIZED_BEGIN
  *++yyvsp = yylval;
  YY_IGNORE_MAYBE_UNINITIALIZED_END

  /* Discard the shifted token.  */
  yychar = YYEMPTY;
  goto yynewstate;


/*-----------------------------------------------------------.
| yydefault -- do the default action for the current state.  |
`-----------------------------------------------------------*/
yydefault:
  yyn = yydefact[yystate];
  if (yyn == 0)
    goto yyerrlab;
  goto yyreduce;


/*-----------------------------.
| yyreduce -- do a reduction.  |
`-----------------------------*/
yyreduce:
  /* yyn is the number of a rule to reduce with.  */
  yylen = yyr2[yyn];

  /* If YYLEN is nonzero, implement the default value of the action:
     '$$ = $1'.

     Otherwise, the following line sets YYVAL to garbage.
     This behavior is undocumented and Bison
     users should not rely upon it.  Assigning to YYVAL
     unconditionally makes the parser a bit smaller, and it avoids a
     GCC warning that YYVAL may be used uninitialized.  */
  yyval = yyvsp[1-yylen];


  YY_REDUCE_PRINT (yyn);
  switch (yyn)
    {
  case 9: /* rawStatement: Rawline  */
#line 37 "griddle.y"
{
	executeRawline(yyvsp[0]);
}
#line 1317 "y.tab.c"
    break;

  case 10: /* assignmentStatement: Name '=' expr  */
#line 44 "griddle.y"
{
	executeAssignment(yyvsp[-2], yyvsp[0]);
}
#line 1325 "y.tab.c"
    break;

  case 11: /* includeStatement: INCLUDE String  */
#line 51 "griddle.y"
{
	executeInclude(yyvsp[0]);
}
#line 1333 "y.tab.c"
    break;

  case 12: /* defineStatement: DEFINE expr String fieldList ENDDEFINE  */
#line 58 "griddle.y"
{
	executeDefine(yyvsp[-3], yyvsp[-2], yyvsp[-1]);
}
#line 1341 "y.tab.c"
    break;

  case 13: /* defineStatement: DEFINE expr String ENDDEFINE  */
#line 62 "griddle.y"
{
	executeDefine(yyvsp[-2], yyvsp[-1], NULL);
}
#line 1349 "y.tab.c"
    break;

  case 14: /* fieldList: field  */
#line 69 "griddle.y"
{
	yyval = buildFieldList(NULL, yyvsp[0]);
}
#line 1357 "y.tab.c"
    break;

  case 15: /* fieldList: fieldList field  */
#line 73 "griddle.y"
{
	yyval = buildFieldList(yyvsp[-1], yyvsp[0]);
}
#line 1365 "y.tab.c"
    break;

  case 16: /* field: basicField  */
#line 80 "griddle.y"
{
	yyval = yyvsp[0];
}
#line 1373 "y.tab.c"
    break;

  case 17: /* field: '#' basicField  */
#line 84 "griddle.y"
{
	yyval = invisifyField(yyvsp[0]);
}
#line 1381 "y.tab.c"
    break;

  case 18: /* basicField: Name ':' fieldType  */
#line 91 "griddle.y"
{
	yyval = buildField(yyvsp[-2], buildExprI(NUM_EXPR, 1), yyvsp[0], NULL);
}
#line 1389 "y.tab.c"
    break;

  case 19: /* basicField: Name '(' expr ')' ':' fieldType  */
#line 95 "griddle.y"
{
	yyval = buildField(yyvsp[-5], yyvsp[-3], yyvsp[0], NULL);
}
#line 1397 "y.tab.c"
    break;

  case 20: /* basicField: Name ':' fieldType '=' exprList  */
#line 99 "griddle.y"
{
	yyval = buildField(yyvsp[-4], buildExprI(NUM_EXPR, 1), yyvsp[-2], yyvsp[0]);
}
#line 1405 "y.tab.c"
    break;

  case 21: /* basicField: Name '(' expr ')' ':' fieldType '=' exprList  */
#line 103 "griddle.y"
{
	yyval = buildField(yyvsp[-7], yyvsp[-5], yyvsp[-2], yyvsp[0]);
}
#line 1413 "y.tab.c"
    break;

  case 22: /* fieldType: CHARACTER  */
#line 109 "griddle.y"
                                { yyval = (int) FIELD_CHARACTER;	}
#line 1419 "y.tab.c"
    break;

  case 23: /* fieldType: BIN15  */
#line 110 "griddle.y"
                                { yyval = (int) FIELD_BIN15;	}
#line 1425 "y.tab.c"
    break;

  case 24: /* fieldType: BIN31  */
#line 111 "griddle.y"
                                { yyval = (int) FIELD_BIN31;	}
#line 1431 "y.tab.c"
    break;

  case 25: /* fieldType: BIT  */
#line 112 "griddle.y"
                                { yyval = (int) FIELD_BIT;		}
#line 1437 "y.tab.c"
    break;

  case 26: /* fieldType: WORDS  */
#line 113 "griddle.y"
                                { yyval = (int) FIELD_WORDS;	}
#line 1443 "y.tab.c"
    break;

  case 27: /* fieldType: REGID  */
#line 114 "griddle.y"
                                { yyval = (int) FIELD_REGID;	}
#line 1449 "y.tab.c"
    break;

  case 28: /* fieldType: OBJID  */
#line 115 "griddle.y"
                                { yyval = (int) FIELD_OBJID;	}
#line 1455 "y.tab.c"
    break;

  case 29: /* fieldType: AVAID  */
#line 116 "griddle.y"
                                { yyval = (int) FIELD_AVAID;	}
#line 1461 "y.tab.c"
    break;

  case 30: /* fieldType: FATWORD  */
#line 117 "griddle.y"
                                { yyval = (int) FIELD_FATWORD;	}
#line 1467 "y.tab.c"
    break;

  case 31: /* fieldType: ENTITY  */
#line 118 "griddle.y"
                                { yyval = (int) FIELD_ENTITY;	}
#line 1473 "y.tab.c"
    break;

  case 32: /* fieldType: BYTE  */
#line 119 "griddle.y"
                                { yyval = (int) FIELD_BYTE;	}
#line 1479 "y.tab.c"
    break;

  case 33: /* fieldType: VARSTRING  */
#line 120 "griddle.y"
                                { yyval = (int) FIELD_VARSTRING;	}
#line 1485 "y.tab.c"
    break;

  case 34: /* objectUseStatement: USE Name Name objectTail  */
#line 125 "griddle.y"
{
	executeUse(yyvsp[-2], yyvsp[-1], yyvsp[0]);
}
#line 1493 "y.tab.c"
    break;

  case 35: /* objectUseStatement: USE Name objectTail  */
#line 129 "griddle.y"
{
	executeUse(yyvsp[-1], NULL, yyvsp[0]);
}
#line 1501 "y.tab.c"
    break;

  case 36: /* objectTail: '=' expr '{' properties '}'  */
#line 136 "griddle.y"
{
	yyval = buildObjectTail(yyvsp[-3], yyvsp[-1]);
}
#line 1509 "y.tab.c"
    break;

  case 37: /* objectTail: '{' properties '}'  */
#line 140 "griddle.y"
{
	yyval = buildObjectTail(NULL, yyvsp[-1]);
}
#line 1517 "y.tab.c"
    break;

  case 38: /* properties: property  */
#line 147 "griddle.y"
{
	yyval = buildPropertyList(NULL, yyvsp[0]);
}
#line 1525 "y.tab.c"
    break;

  case 39: /* properties: properties property  */
#line 151 "griddle.y"
{
	yyval = buildPropertyList(yyvsp[-1], yyvsp[0]);
}
#line 1533 "y.tab.c"
    break;

  case 40: /* property: Name ':' exprList  */
#line 158 "griddle.y"
{
	yyval = buildProperty(yyvsp[-2], yyvsp[0]);
}
#line 1541 "y.tab.c"
    break;

  case 41: /* exprList: expr  */
#line 165 "griddle.y"
{
	yyval = buildExprList(NULL, yyvsp[0]);
}
#line 1549 "y.tab.c"
    break;

  case 42: /* exprList: exprList ',' expr  */
#line 169 "griddle.y"
{
	yyval = buildExprList(yyvsp[-2], yyvsp[0]);
}
#line 1557 "y.tab.c"
    break;

  case 43: /* expr: Name  */
#line 176 "griddle.y"
{
	yyval = buildExprP(ID_EXPR, yyvsp[0]);
}
#line 1565 "y.tab.c"
    break;

  case 44: /* expr: Number  */
#line 180 "griddle.y"
{
	yyval = buildExprI(NUM_EXPR, yyvsp[0]);
}
#line 1573 "y.tab.c"
    break;

  case 45: /* expr: String  */
#line 184 "griddle.y"
{
	yyval = buildExprP(STRING_EXPR, yyvsp[0]);
}
#line 1581 "y.tab.c"
    break;

  case 46: /* expr: BitString  */
#line 188 "griddle.y"
{
	yyval = buildExprP(BITSTRING_EXPR, yyvsp[0]);
}
#line 1589 "y.tab.c"
    break;

  case 47: /* expr: '(' expr ')'  */
#line 192 "griddle.y"
{
	yyval = buildExprP(EXPR_EXPR, yyvsp[-1]);
}
#line 1597 "y.tab.c"
    break;

  case 48: /* expr: SUB expr  */
#line 196 "griddle.y"
{
	yyval = buildExprIP(UNOP_EXPR, UMINUS, yyvsp[0]);
}
#line 1605 "y.tab.c"
    break;

  case 49: /* expr: NOT expr  */
#line 200 "griddle.y"
{
	yyval = buildExprIP(UNOP_EXPR, NOT, yyvsp[0]);
}
#line 1613 "y.tab.c"
    break;

  case 50: /* expr: A expr  */
#line 204 "griddle.y"
{
	yyval = buildExprIP(UNOP_EXPR, A, yyvsp[0]);
}
#line 1621 "y.tab.c"
    break;

  case 51: /* expr: O expr  */
#line 208 "griddle.y"
{
	yyval = buildExprIP(UNOP_EXPR, O, yyvsp[0]);
}
#line 1629 "y.tab.c"
    break;

  case 52: /* expr: R expr  */
#line 212 "griddle.y"
{
	yyval = buildExprIP(UNOP_EXPR, R, yyvsp[0]);
}
#line 1637 "y.tab.c"
    break;

  case 53: /* expr: expr ADD expr  */
#line 216 "griddle.y"
{
	yyval = buildExprPIP(BIN_EXPR, yyvsp[-2], ADD, yyvsp[0]);
}
#line 1645 "y.tab.c"
    break;

  case 54: /* expr: expr SUB expr  */
#line 220 "griddle.y"
{
	yyval = buildExprPIP(BIN_EXPR, yyvsp[-2], SUB, yyvsp[0]);
}
#line 1653 "y.tab.c"
    break;

  case 55: /* expr: expr MUL expr  */
#line 224 "griddle.y"
{
	yyval = buildExprPIP(BIN_EXPR, yyvsp[-2], MUL, yyvsp[0]);
}
#line 1661 "y.tab.c"
    break;

  case 56: /* expr: expr DIV expr  */
#line 228 "griddle.y"
{
	yyval = buildExprPIP(BIN_EXPR, yyvsp[-2], DIV, yyvsp[0]);
}
#line 1669 "y.tab.c"
    break;

  case 57: /* expr: expr MOD expr  */
#line 232 "griddle.y"
{
	yyval = buildExprPIP(BIN_EXPR, yyvsp[-2], MOD, yyvsp[0]);
}
#line 1677 "y.tab.c"
    break;

  case 58: /* expr: expr AND expr  */
#line 236 "griddle.y"
{
	yyval = buildExprPIP(BIN_EXPR, yyvsp[-2], AND, yyvsp[0]);
}
#line 1685 "y.tab.c"
    break;

  case 59: /* expr: expr OR expr  */
#line 240 "griddle.y"
{
	yyval = buildExprPIP(BIN_EXPR, yyvsp[-2], OR, yyvsp[0]);
}
#line 1693 "y.tab.c"
    break;

  case 60: /* expr: expr XOR expr  */
#line 244 "griddle.y"
{
	yyval = buildExprPIP(BIN_EXPR, yyvsp[-2], XOR, yyvsp[0]);
}
#line 1701 "y.tab.c"
    break;


#line 1705 "y.tab.c"

      default: break;
    }
  /* User semantic actions sometimes alter yychar, and that requires
     that yytoken be updated with the new translation.  We take the
     approach of translating immediately before every use of yytoken.
     One alternative is translating here after every semantic action,
     but that translation would be missed if the semantic action invokes
     YYABORT, YYACCEPT, or YYERROR immediately after altering yychar or
     if it invokes YYBACKUP.  In the case of YYABORT or YYACCEPT, an
     incorrect destructor might then be invoked immediately.  In the
     case of YYERROR or YYBACKUP, subsequent parser actions might lead
     to an incorrect destructor call or verbose syntax error message
     before the lookahead is translated.  */
  YY_SYMBOL_PRINT ("-> $$ =", YY_CAST (yysymbol_kind_t, yyr1[yyn]), &yyval, &yyloc);

  YYPOPSTACK (yylen);
  yylen = 0;

  *++yyvsp = yyval;

  /* Now 'shift' the result of the reduction.  Determine what state
     that goes to, based on the state we popped back to and the rule
     number reduced by.  */
  {
    const int yylhs = yyr1[yyn] - YYNTOKENS;
    const int yyi = yypgoto[yylhs] + *yyssp;
    yystate = (0 <= yyi && yyi <= YYLAST && yycheck[yyi] == *yyssp
               ? yytable[yyi]
               : yydefgoto[yylhs]);
  }

  goto yynewstate;


/*--------------------------------------.
| yyerrlab -- here on detecting error.  |
`--------------------------------------*/
yyerrlab:
  /* Make sure we have latest lookahead translation.  See comments at
     user semantic actions for why this is necessary.  */
  yytoken = yychar == YYEMPTY ? YYSYMBOL_YYEMPTY : YYTRANSLATE (yychar);
  /* If not already recovering from an error, report this error.  */
  if (!yyerrstatus)
    {
      ++yynerrs;
      yyerror (YY_("syntax error"));
    }

  if (yyerrstatus == 3)
    {
      /* If just tried and failed to reuse lookahead token after an
         error, discard it.  */

      if (yychar <= YYEOF)
        {
          /* Return failure if at end of input.  */
          if (yychar == YYEOF)
            YYABORT;
        }
      else
        {
          yydestruct ("Error: discarding",
                      yytoken, &yylval);
          yychar = YYEMPTY;
        }
    }

  /* Else will try to reuse lookahead token after shifting the error
     token.  */
  goto yyerrlab1;


/*---------------------------------------------------.
| yyerrorlab -- error raised explicitly by YYERROR.  |
`---------------------------------------------------*/
yyerrorlab:
  /* Pacify compilers when the user code never invokes YYERROR and the
     label yyerrorlab therefore never appears in user code.  */
  if (0)
    YYERROR;
  ++yynerrs;

  /* Do not reclaim the symbols of the rule whose action triggered
     this YYERROR.  */
  YYPOPSTACK (yylen);
  yylen = 0;
  YY_STACK_PRINT (yyss, yyssp);
  yystate = *yyssp;
  goto yyerrlab1;


/*-------------------------------------------------------------.
| yyerrlab1 -- common code for both syntax error and YYERROR.  |
`-------------------------------------------------------------*/
yyerrlab1:
  yyerrstatus = 3;      /* Each real token shifted decrements this.  */

  /* Pop stack until we find a state that shifts the error token.  */
  for (;;)
    {
      yyn = yypact[yystate];
      if (!yypact_value_is_default (yyn))
        {
          yyn += YYSYMBOL_YYerror;
          if (0 <= yyn && yyn <= YYLAST && yycheck[yyn] == YYSYMBOL_YYerror)
            {
              yyn = yytable[yyn];
              if (0 < yyn)
                break;
            }
        }

      /* Pop the current state because it cannot handle the error token.  */
      if (yyssp == yyss)
        YYABORT;


      yydestruct ("Error: popping",
                  YY_ACCESSING_SYMBOL (yystate), yyvsp);
      YYPOPSTACK (1);
      yystate = *yyssp;
      YY_STACK_PRINT (yyss, yyssp);
    }

  YY_IGNORE_MAYBE_UNINITIALIZED_BEGIN
  *++yyvsp = yylval;
  YY_IGNORE_MAYBE_UNINITIALIZED_END


  /* Shift the error token.  */
  YY_SYMBOL_PRINT ("Shifting", YY_ACCESSING_SYMBOL (yyn), yyvsp, yylsp);

  yystate = yyn;
  goto yynewstate;


/*-------------------------------------.
| yyacceptlab -- YYACCEPT comes here.  |
`-------------------------------------*/
yyacceptlab:
  yyresult = 0;
  goto yyreturnlab;


/*-----------------------------------.
| yyabortlab -- YYABORT comes here.  |
`-----------------------------------*/
yyabortlab:
  yyresult = 1;
  goto yyreturnlab;


/*-----------------------------------------------------------.
| yyexhaustedlab -- YYNOMEM (memory exhaustion) comes here.  |
`-----------------------------------------------------------*/
yyexhaustedlab:
  yyerror (YY_("memory exhausted"));
  yyresult = 2;
  goto yyreturnlab;


/*----------------------------------------------------------.
| yyreturnlab -- parsing is finished, clean up and return.  |
`----------------------------------------------------------*/
yyreturnlab:
  if (yychar != YYEMPTY)
    {
      /* Make sure we have latest lookahead translation.  See comments at
         user semantic actions for why this is necessary.  */
      yytoken = YYTRANSLATE (yychar);
      yydestruct ("Cleanup: discarding lookahead",
                  yytoken, &yylval);
    }
  /* Do not reclaim the symbols of the rule whose action triggered
     this YYABORT or YYACCEPT.  */
  YYPOPSTACK (yylen);
  YY_STACK_PRINT (yyss, yyssp);
  while (yyssp != yyss)
    {
      yydestruct ("Cleanup: popping",
                  YY_ACCESSING_SYMBOL (+*yyssp), yyvsp);
      YYPOPSTACK (1);
    }
#ifndef yyoverflow
  if (yyss != yyssa)
    YYSTACK_FREE (yyss);
#endif

  return yyresult;
}


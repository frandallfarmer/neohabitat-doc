/* A Bison parser, made by GNU Bison 3.8.2.  */

/* Bison interface for Yacc-like parsers in C

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

/* DO NOT RELY ON FEATURES THAT ARE NOT DOCUMENTED in the manual,
   especially those whose name start with YY_ or yy_.  They are
   private implementation details that can be changed or removed.  */

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

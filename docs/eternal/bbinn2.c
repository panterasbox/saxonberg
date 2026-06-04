//  bbinn2.c
#include "/zone/null/eternal/eternal.h"
//  Bed and Breakfast Inn--Receptionist's Desk

#define DOWN         "bbinn1"

#define DAY_LIGHT    WELL_LIT

#define INSIDE
#define NOSTEAL
#define NOPK
#define NOCOMBAT

#define SHORT        "Bed & Breakfast Inn, Reception"
#define DAY_LONG\
  "This is a small, plain room where the receptionist receives guests " \
  "who stay at the Bed & Breakfast Inn.  The only outstanding feature of " \
  "the room is a large, wooden desk that takes up much of the northern " \
  "part of the place.  A winding staircase leads down into the lobby."

#define OBJ1         StorageCode
#define OBJ2         "/zone/null/eternal/monsters/receptionist"
#define OBJ3         "/zone/null/eternal/objects/magmirror"
#define OBJ4         "/zone/null/toys/bin/machine"

#define ITEM1 ({ "desk", "wooden desk" })
#define ID1\
  "This is a large desk covered with papers, flower vases, and a name tag " \
  "that says, \"Viola\"."

#define ITEM2 ({ "staircase", "stairs" })
#define ID2\
  "The wooden staircase leads back down to the lobby."

#include "room.c"

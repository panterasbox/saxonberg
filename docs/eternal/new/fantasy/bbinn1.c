//  bbinn1.c

#define EAST         "room007"
#define UP           "bbinn2"

#define DAY_LIGHT    WELL_LIT

#define INSIDE

#define SHORT        "Bed & Breakfast Inn, Lobby"
#define DAY_LONG\
  "You are in a large, square room that serves as the main "+\
  "lobby in the Bed & Breakfast Inn.  A dark red carpet "+\
  "covers most of the floor and several polished wooden "+\
  "chairs circle a carved stone table in one corner of the "+\
  "room.  A staircase leads up to the receptionist's desk.  "+\
  "Eternal Way can be seen through the open doorway to the east."

#define ITEM1 ({ "carpet", "red carpet", "dark red carpet", "floor" })
#define ID1\
  "Despite the heavy traffic through this lobby, the carpet looks brand-new."

#define ITEM2 ({ "chairs", "chair", "wooden chairs" })
#define ID2\
  "These are your standard wooden chairs."

#define ITEM3 ({ "table", "stone table", "carved stone table" })
#define ID3\
  "This is a circular stone table, nestled in the corner of the lobby."

#define ITEM4 ({ "staircase", "stairs" })
#define ID4\
  "The wooden staircase leads upstairs."

#include "room.c"

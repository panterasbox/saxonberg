inherit RoomPlusCode;
#include "/zone/null/eternal/eternal.h"
#define EC "/zone/null/eternal/"

#include "clothiers.h"

#define SHORT   "Aleron & Anthrax Clothiers"

#define DAY_LONG    "You are absolutely amazed by the variety and "\
"quantity of clothing on display here.  Racks and shelves lining the walls "\
"and aisles hold items of apparel of all sizes, shapes, and descriptions -- "\
"men's, women's, humanoid and non-human.  If you can imagine it, you can "\
"find it here; if we don't have it stock, A&A Clothiers' staff of "\
"tailors can surely make it for you.  Near the front of the store is a "\
"counter, on top of which is a small sign."

#define DAY_LIGHT   WELL_LIT

#define SOUTH   "room024"

#define MAP_SYMBOL "AAC"

#define ITEM1   "sign"
#define ITEM2   "racks"
#define ITEM3   "shelves"
#define ID1 "\n      Aleron & Anthrax Clothiers\n"+\
        "\nPlease ask a staffperson for assistance.\n"+\
        "\n                      The Management\n\n"
#define ID2 "The racks are covered with the largest variety of clothing "+\
        "you have ever seen in your life.  Although it seems to be a "+\
        "mess, the staff probably knows exactly where everything is."
#define ID3 "The shelves look like all the apparel that wouldn't fit on "+\
        "the racks was placed on the shelves in a rather haphazard "+\
        "manner.  The staff probably knows exactly where each item is "+\
        "though."

#define OBJ1    "/zone/null/eternal/monsters/ambrose"

void extra_create()
{
    set( "map_symbol", MAP_SYMBOL );
    set( "map_hint_x", -1 );
    set("day_light", DAY_LIGHT);
    set("short", SHORT);
    set("day_long", DAY_LONG);
    set(InsideP,1);
    set("descs", ([ ITEM1:ID1, ITEM2:ID2, ITEM3:ID3 ]) );
    set("exits", ([ "south":SOUTH ]) );
    set("reset_data", ([ "ambrose":OBJ1 ]) );
}

extra_init()
{
    if(THISP->query_aggressive()) destruct(THISP);
    if( query("ambrose") && present(query("ambrose")) )
        clothes_init();
    add_action("do_read", "read");
}

do_read(str)
{
    if(!str || str != "sign") return 0;

    write(long("sign"));
    return 1;
}

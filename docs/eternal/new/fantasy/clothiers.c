inherit RoomPlusCode;
#define EC "/zone/null/eternal/"
#define CLOTHES "/zone/null/eternal/objects"

#include "/zone/null/eternal/objects/clothes.c"

#define SHORT 	"Aleron & Anthrax Clothiers"

#define DAY_LONG	"You are absolutely amazed by the variety and "+\
"quantity of clothing on display here.  Racks and shelves lining the walls "+\
"and aisles hold items of apparel of all sizes, shapes, and descriptions -- "+\
"men's, women's, humanoid and non-human.  If you can imagine it, you can "+\
"find it here; if we don't have it stock, A&A Clothiers' staff of "+\
"tailors can surely make it for you.  Near the front of the store is a "+\
"counter, on top of which is a small sign."

#define DAY_LIGHT 	WELL_LIT

#define SOUTH	"room024"

#define ITEM1	"sign"
#define ID1	"\n      Aleron & Anthrax Clothiers\n"+\
		"\nPlease ask a staffperson for assistance.\n"+\
		"\n                      The Management\n\n"

#define OBJ1	"/zone/null/eternal/monsters/ambrose"

void extra_create()
{
	set("day_light", DAY_LIGHT);
	set("short", SHORT);
	set("day_long", DAY_LONG);
	set(InsideP,1);
	set("descs", ([ ITEM1:ID1 ]) );
	set("exits", ([ "south":SOUTH ]) );
	set("reset_data", ([ "ambrose":OBJ1 ]) );
	set("descs", ([ ITEM1: ID1 ]) );
   customer = "zxasqwcvdfer";
}

extra_init()
	{
	if(THISP->query_aggressive()) destruct(THISP);
	if( query("ambrose") && present(query("ambrose")) )
           clothes_init();
	add_action("do_read", "read");
	}

int query_enter_ok()
{
	int i;
	object *who, *targs;

	who = users();
	targs = THISP->query_targets();
	if(sizeof(targs))
	  for(i=0; i<sizeof(targs); i++)
		if(searcha(who, targs[i]) >= 0)
		return 1;

   return 0;
}

do_read(str)
	{
	if(!str || str != "sign") return 0;

	THISO->long("sign");
	return 1;
	}

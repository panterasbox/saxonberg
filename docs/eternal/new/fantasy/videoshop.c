#include "/zone/null/cabaltv/TV.h"
#define TAPELIST TAPEDIR+"/tapes.list"
#define TVGUIDE TVDIR+"/guide/TVGuide"
#define COST 50
inherit RoomPlusCode;

#define SHORT "Videopolis"

#define DAY_LONG	"The absolute center of video entertainment "+\
"throughout the dimensions, Videopolis "+\
"deals in the finest tapes, as well as having a private viewing "+\
"lounge on the premises.  A young man, dressed neatly yet casually, "+\
"smiles at you from behind the counter, waiting to serve "+\
"you with pandimensionally famous Videopolis courtesy.\n\n"+\
"There is a small sign on the countertop."

#define ITEM1 	"sign"
#define ID1	"The sign reads: Simply type "+\
"'list' for our staffperson to assist you with our "+\
"current inventory.  To make a purchase, type 'buy <#>'.\n"

#define DAY_LIGHT 	WELL_LIT

#define SOUTH	"vidlounge"

#define WEST	"room029"

extra_create()
	{
	set("short", SHORT);
	set("day_long", DAY_LONG);
	set("day_light", DAY_LIGHT);
	set(InsideP,1);
	set("descs", ([ ITEM1:ID1 ]) );
	set("exits", ([ "south":SOUTH, "west":WEST ]) );
	}

extra_init()
	{
	add_action("do_read", "read");
	add_action("do_buy", "buy");
	add_action("do_list", "list");
	}


do_read(str)
	{
	if(str == "sign")
		{
		THISO->long("sign");
		return 1;}
	return 0;
	}

do_list()
	{
	string *item;
	int i;

	write("The young man behind the counter says:\n");
	write("All items for sale in this store cost "+COST+" coins.\n");
	write("Videopolis currently carries the following: \n\n"); 
	write("\tItem #        Item\n");
	write("\t------        ------------------------------\n");
	write("\t     0        TV Guide (magazine)\n");

	item = grab_file(TAPEDIR+"/tapes.list");
	for(i=0; i<sizeof(item); i+=2)
		write("\t"+pad(i+1, -6)+"        "+pad(item[i], 30)+"\n");
	write("\n");
	return 1;
	}

do_buy(str)
	{
	string *item;
	int i, num, size;
	object ob;
	
	if(!str || !sscanf(str, "%d", num))
		{
		write(strformat("Please 'buy <#>'.  If you would like, "+
		  "I can list the selections for you again.\n", 
		  "The young man says: "));
		return 1;}

	if(THISP->query_money() < COST)
		{
		write(strformat("You haven't got "+COST+
		  " coins to buy anything with.\n",
		  "The young man says: "));
		return 1;}

	item = grab_file(TAPELIST);
	if(num && !item)
		{
		write(strformat("I'm sorry, but we're currently performing a "+
		   "physical inventory.  Please come again at a later time.\n",
		   "The young man says: "));
		return 1;}
		
	size = sizeof(item);

	if(num < 0 || num > size)
		{
		write(strformat("Sorry, there is nothing in our inventory"+
			" with that number.\n", "The young man says: "));
		return 1;}
		
	if(num == 0)
		ob = clone_object(TVGUIDE);
	else
		{
		num = num * 2 - 1;
		ob = clone_object( (TAPEDIR+"/"+item[num]) );
		}
		
	if(!ob)
		{
		write(strformat("I'm sorry, I'm afraid we've run out of that "+
			"particular item temporarily.\n", 
			"The young man says: "));
		return 1;}
	if(move_object(ob, THISP))
		write("The clerk hands you "+ob->short()+".\n");
	else {
		move_object(ob, THISO);
		write("The clerk sets "+ob->short()+" down on the counter "+
			"before you.\n"); }
	say("The clerk gives "+PNAME+" "+ob->short()+".\n");
	tell_room(THISO, "He smiles and says, 'Thank you for shopping "+
		"at Videopolis!  Please come again!'\n");
	THISP->add_money( (0 - COST) );
	return 1;
}	

inherit ObjectCode;
#include "path.h"
object suit;
object sharv;
object gloves;
object boots;
object helmet;

void extra_create()
{
    add("id","Machine");
    add("id","vending machine");
    add("id","machine");
    add("id","dispensor");
    set("short","Flicker's Newbie Armor Vending Machine");
    set("long","This is a machine that was created to teach newbies, like " +
      "yourself about armor.  There are several pieces of armor, that cover all " +
      "of your body.  For a list of items available here, type " +
      "<list items>.  If you wish to buy one, type buy <item name>.");
    set("gettable",0);
    set("droppable",0);
    set("weight",100000);
    set("value",0);
}
void extra_init()
{
    add_action("list_items", "list");
    add_action("buy_item", "buy");
}
int list_items(string arg)
{
    if(arg == "items" || arg == "armor")
    {
	write("Items available:\n" +
	  "A Cheap Suit of Armor--suit\n" +
	  "A Cheap Pair of Gloves--gloves\n" +
	  "A Cheap Pair of Boots--boots\n" +
	  "A Cheap Tail Sharv--sharv\n" +
	  "A Cheap Helmet--helmet\n");
	return(1);
    }
    else
    {
	write("What do you want a list of?\n");
    }
}
int buy_item(string g)
{
    if(g == "suit")
    {
	suit=clone_object(ARMOR+ "msuit");
	if(!THISP->add_weight(suit->query("weight")))
	{
	    notify_fail("Carrying that would overburden you!\n");
	    destruct(suit);
	    return(1);
	}
	move_object(suit, THISP);
	write("You push a button on the machine and recieve a FREE suit of armor!\n");
	say(PNAME+ " pushes a button on the machine.\n");
	return(1);
    }
    if(g == "gloves")
    {
	gloves=clone_object(ARMOR+ "mgloves");
	if(!THISP->add_weight(gloves->query("weight")))
	{
	    notify_fail("Carrying that would overburden you!\n");
	    destruct(gloves);
	    return(1);
	}
	move_object(gloves, THISP);
	write("You push a button on the machine and recieve a FREE pair of gloves!\n");
	say(PNAME+ " pushes a button on the machine.\n");
	return(1);
    }
    if(g == "sharv")
    {
	sharv=clone_object(ARMOR+ "msharv");
	if(!THISP->add_weight(sharv->query("weight")))
	{
	    notify_fail("Carrying that would overburden you!\n");
	    destruct(sharv);
	    return(1);
	}
	move_object(sharv, THISP);
	write("You push a button on the machine and recieve a FREE tail sharv!\n");
	say(PNAME+ " pushes a button on the machine.\n");
	return(1);
    }
    if(g == "boots")
    {
	boots=clone_object(ARMOR+ "mboots");
	if(!THISP->add_weight(boots->query("weight")))
	{
	    notify_fail("Carrying that would overburden you!\n");
	    destruct(boots);
	    return(1);
	}
	move_object(boots, THISP);
	write("You push a button on the machine and recieve a FREE pair of boots.\n");
	say(PNAME+ " pushes a button on the machine.\n");
	return(1);
    }
    if(g == "helmet")
    {
	helmet=clone_object(ARMOR+ "mhelmet");
	if(!THISP->add_weight(helmet->query("weight")))
	{
	    notify_fail("Carrying that would overburden you!\n");
	    destruct(helmet);
	    return(1);
	}
	move_object(helmet, THISP);
	write("You push a button on the machine and recieve a FREE helmet!\n");
	say(PNAME+ " pushes a button on the machine.\n");
	return(1);
    }
    else
    {
	write("What are you trying to buy?\n");
    }
    return(1);
}

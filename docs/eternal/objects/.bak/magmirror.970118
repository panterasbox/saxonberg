/* Idea for this object originally by Masochist.
** Project started & conceptualized by Tabitha.
** I only take credit for the grunt work ;^)  -- Anthrax */
inherit ObjectCode;

void extra_create()
{
    set("id","mirror");
    set("short","Anthrax's Magic Mirror");
    set("long","This full-length mirror is designed to "+
	   "display what you're wearing on every area of your body, "+
	   "as well as what's protecting your entire body.  "+
	   "It's handy to find that crucial chink in your armor.  "+
	   "Just <look in mirror> to see just where you are (and aren't) "+
	   "vulnerable.\n\nA tiny inscription on its base reads: Thanx Taby :^)\n");
    set( MagicP, 1 );
    set("gettable", 0);
    set("droppable", 0);
}

void extra_init()
{
	add_action("view_armors", "look");
}

view_armors(str)
{
	int x, y;
	string *hit_locs, *areas, output;
	object *armor, *output2;

	if(!str || str != "in mirror") return 0;

	hit_locs = filter_array(THISP->query_hit_locations(), "check_locs");
	armor = THISP->query_armor_worn();
	write( "\t"+ pad("Location", 15) + "   :   " +
		pad("Armor", 50) + "\n\n");

    for( x=0; x < sizeof( hit_locs ); x ++ )
    {
	output = "nothing";
	for( y = 0; y < sizeof ( armor ); y ++ )
	{
	    if(objectp(armor[y])) areas = armor[y]->query_areas();
	if(sizeof(areas))
	    if( searcha( areas, hit_locs[x] ) != -1 )
		output = armor[y]->query("short");
	}
	write( "\t"+ pad(hit_locs[x], 15) + "   :   " + 
		pad(output, 50) + "\n" );
    }

	if(sizeof(armor))
	output2 = filter_array(armor, "check_areas");

	if(sizeof(output2)) {
	write("\t"+pad("entire body", 15)+ "   :   "+pad(output2[0]->query("short"),50)+"\n");
	for(x=1; x < sizeof(output2); x++)
	   write(pad(" ",30) + pad(output2[x]->query("short"),50)+ "\n");
	   }

	say(PNAME+" looks at "+objective(THISP)+"self in the magic mirror.\n");
	return 1;
}

check_locs(arg)
	{
	return ( stringp(arg) );
	}

check_areas(object arg)
	{
	int areas;

	areas = arg->query_areas();
	return (!sizeof(areas) || areas[0] == "cloak" || areas[0] == "shield");
	}

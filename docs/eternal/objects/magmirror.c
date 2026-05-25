/* Idea for this object originally by Masochist.
** Project started & conceptualized by Tabitha.
** I only take credit for the grunt work ;^)  -- Anthrax */

inherit ThingCode;

void extra_create()
{
    set("id","mirror");
    set( "short", "a magic mirror" );
    set("long","This full-length mirror is designed to "+
      "display what you're wearing on every area of your body, "+
      "as well as what's protecting your entire body.  "+
      "It's handy to find that crucial chink in your armor.  "+
      "Just <look in mirror> to see just where you are (and aren't) "+
      "vulnerable.\n" );
    set( MagicP, 1 );
    set("gettable", 0);
    set("droppable", 1);
    set(NoCleanUpP,1);
}

void extra_init()
{
    add_action("view_armors", "look");
}

string
my_cloak( object *obs ) {
	object ob;

	foreach( ob : obs )
		if( ob->query(CloakP) )
		    return ob->query("short");

    return 0;
}

string
my_shield( object *obs ) {
	object ob;

	foreach( ob : obs )
	    if( ob->query(ShieldP) ) return ob->query("short");

	return 0;
}

status
view_armors( string str ) { // Command parser for viewing armor status
	int i;
    string *hit_locs, loc, *areas, output, cloak, shield;
    object *my_armor, armor;

    if(!str || str != "in mirror") return 0;

    hit_locs = filter(THISP->query_hit_locations(), #'stringp );
    my_armor = THISP->query_armor_worn();
    printf( "\n\t%-15s   :   %-15s\n", "Location", "Armor" );
    write("\t-------------------------------------\n");

    foreach( loc : hit_locs ) {
	    output = "nothing";
	    foreach( armor : my_armor ) {
	        if(!objectp(armor)) continue;
	        areas = armor->query_areas();
	        if( armor->query(AllAreasP) ||
	            (sizeof(areas) && member( areas, loc ) != -1 ) )
		        output = armor->query("short");
	    }
	    write( sprintf("\t%-15s   :   %-40s\n", loc, output ) );
    }

    cloak = my_cloak( my_armor );
    if( stringp(cloak) )
       printf("\t%-15s   :   %-40s\n", "cloak", cloak );

    shield = my_shield( my_armor );
    if( stringp( shield ) )
       printf("\t%-15s   :   %-40s\n", "shield", shield );

    say(PNAME+" looks at "+objective(THISP)+"self in the magic mirror.\n");
    return 1;
}

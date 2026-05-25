/* 8ball */
inherit RoomPlusCode;
#define EAST   "alley6"
#define OTHER_SIDE    "/zone/null/eternal/rogue/rogue1"

void extra_create()
{  set( "short", "Eight Ball Bar & Grill" );
   set( "day_long",
     "Welcome to the Eight Ball Bar & Grill, where we pride "+
	  "ourselves in th e finest cocktail drinks around, as "+
	  "well as the best grill and cajun cooking since the "+
	  "beginning of time!  This pub consists of one large, "+
	  "dimly lit room.  Multitudes of chairs and tables have been "+
	  "placed throughout the room.  A mini-grand piano has "+
	  "been placed in one corner for entertainment of the "+
	  "pub's guests, but the pianist must be absent because "+
	  "nobody is sitting on the piano bench." );
	  add( "exits", ([ "east" : EAST ]) );
	  set( "day_light", 100 );
	  set( "night_light", 10 );
   set( "descs", ([
		  "piano" :
         "This is a mini-grand piano that is constructed from fine "+
         "black laquer with gold trim.  Too bad the pianist is gone, "+
         "because by the look of it, this piano would sure sound "+
			  "great!\n",
		  "bench" :
         "This is a fine wooden bench coated with black lacquer.  "+
			  "It looks comfortable.  Too bad the pianist is "+
			  "gone, or else the piano might be put to better "+
			  "use.  While looking at the bench, you notice "+
			  "that the bench has been bolted to the floor "+
			  "underneath it.",
		  "floor" :
         "Upon closer inspection, the floor underneath the piano "+
			  "bench is not continuous with the remainder of the "+
			  "floor in the room.  You then notice that you can "+
			  "trace a semi-circular groove around the area where "+
			  "the piano bench has been placed, a groove which "+
			  "terminates at both ends in the wall closest to "+
			  "where the piano has been placed.",
		  "wall" :
         "The wall closest to the piano has two vertical cracks "+
			  "that you barely miss due to their clever "+
			  "construction.  The cracks line up exactly to the "+
			  "grooves you had discovered in the floor.  You now "+
			  "determine that the wall and the floor have been "+
			  "constructed to somehow turn in a 180-360 degree "+
			  "fashion, so that someone standing close to the wall "+
			  "might end up on the other side... but how?"
	   ]) );
}

status do_sit(string arg)
{
string s;

	notify_fail("Sit on what?\n");
	if( !arg )
		return 0;
	if( !sscanf(arg, "on %s", s))
	{
		if( !sscanf(arg, "in %s", s))
			s = arg;
	}
	if(( s == "chair" ) || ( s == "bench" ))
	{
		write( strformat( "You sit on the piano bench and the floor "+
		  "beneath you and wall beside you begin rotating in a "+
		  "counter-clockwise fashion.  Before you know it, you have "+
		  "turned a full 180 degrees and now stand on the other "+
		  "side of the wall that was closest to the piano.\n"));

      say( strformat( PNAME + " sits on the piano bench, and the "+
		  "floor beneath it and the wall beside it rotate 180 "+
		  "degrees.  A new piano bench arrives as " + PNAME +
		  " disappears to the other side of the wall."));

		tell_room(OTHER_SIDE, strformat(
		  "The floor and wall closest to the piano bench rotate, "+
		  "bringing " + PNAME + " in with it."));
		move_object(THISP, OTHER_SIDE);
		command("glance", THISP);
		return 1;
	}
	return 0;
}

void extra_init()
{
  ::extra_init();
  add_action( "do_sit", "sit" );
}

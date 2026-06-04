inherit ThingCode;
 
#define MEAT "turkey_meat"
 
void extra_create()
{
  set("id", ({
    "turkey",
    "chicken",
    "meat",
    "the bane of all australians",
    "nice roasted turkey",
    "roasted turkey",
    "nice turkey",
    }) );
  set("short","a nice roasted turkey");
  set("long","Yep, you guessed it.  A mouth-watering, "
    "slow-roasted, juice-filled turkey that is happily "
    "resting on GOOD OL' AMERICAN SOIL!!!  Go ahead!  "
    "Try <carve turkey> or something..");
}
 
void extra_init()
{
  add_action("carve_turkey","carve");
  add_action("carve_turkey","cut");
  add_action("carve_turkey","get");
  add_action("carve_turkey","slice");
}
 
carve_turkey(string str)
{
  if( !str )
    {
    write( capitalize(query_verb()) + " what?\n" );
    return 1;
    }
  if( !id(str) )
    {
    return 0;
    }
  move_object(clone_object(MEAT),THISP);
  say( PNAME + " tears a leg off of the turkey.\n" );
  tell_object( THISP, strformat( "You tear a leg off of the turkey.\n"
    "Uncle Sam appears in a flash of raw power!\n"
    "Uncle Sam throws his head back and cries: Let there be Turkey!!!\n"
    "The turkey twists and reshapes itself to become whole once more.\n"
    "Uncle Sam disappears, in search of Thanksgiving-bashing Australians.") );
  return 1;
}

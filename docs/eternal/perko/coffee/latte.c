inherit ObjectCode;
 
#include "path.h"
 
int drinks;
 
void extra_create()
  {
  set( "id", ({
    "full latte",
    "full cafe latte",
    "cafe latte",
    "latte",
    "pete's cafe latte",
    "pete's latte",
    "pete's coffee",
    "coffee",
    "mug",
    "mug of latte",
    "mug of cafe latte",
    "mug of coffee",
    }) );
  set( "short", "a honkin' big mug of Pete's cafe latte" );
  set( "long",
    "This huge mug/cup thing seems to be filled to the brim "
    "with a lactose-saturated latte thing.  Steamed milk stretches "
    "as far as the eye can see, efficiently hiding the perfect amount "
    "of actual coffee-type stuff down in the bottom.  To attempt "
    "to consume this monstrosity, you might want to <drink> the latte.." );
  set( "weight", 10 );
  set( "value", 0 );
  drinks = 2;
  }
 
void extra_init() 
  {
  add_action( "drink", "drink" );
  }
 
drink (string str) 
  {
  if(!str)
    {
    write( strformat( "Everyone in the room stares at you, giggling "
      "behind their hands.\nYou suddenly realize that you should "
      "probably be a little more specific as to what you wish to "
      "drink." ) );
    say( strformat( "There are some people, say for instance "
      + PNAME + ", that, being as clever as a button, expect the "
      "world to know what they mean when they type \"drink\" without "
      "adding what it is that they wish to drink.\nYou snicker at "
      + PNAME + ".\n" + PNAME + " turns a bright red." ) );
    return 1;
    }
  if ( id( str ) ) 
    {
    if( drinks == 0 )
      return 0;
    if( drinks == 1 )
      {
      say( strformat( PNAME + " finishes off the rest of their "
        "cafe latte in a mad gulping motion." ) );
      write( strformat( "You desperately finish off your latte, hoping "
        "it won't mysteriously vanish!" ) );
      THISP -> add_fatigue( 8 );
      move_object( clone_object( COFFEE "coffmug" ), THISP );
      destruct( THISO );
      return 1;
      }
    if( drinks == 2 )
      {
      say( strformat( "After taking a slurp of Pete's cafe latte, "
        + PNAME + " coughs a few times, a look of utter delight "
        "flashing across " + possessive(THISP) + " face." ) );
      write( strformat( "You take a slurp of Pete's cafe latte.\n"
        "You cough a few times, having not expected this latte to "
        "be so incredibly good!" ) );
      THISP -> add_fatigue( 8 );
      THISO -> set( "id", ({
        "half latte",
        "cafe latte",
        "latte",
        "pete's cafe latte",
        "pete's latte",
        "pete's coffee",
        "coffee",
        "mug",
        "mug of cafe latte",
        "mug of latte",
        "mug of coffee",
        }) );
      THISO -> set( "short", "a half-full, steaming mug of Pete's cafe latte" );
      THISO -> set( "long", "  The latte in this big ol' "
        "mug/cup thing seems to have been consumed to the halfway point.  "
        "That doesn't mean that it isn't still tasty though..  Maybe you "
        "should <drink> the latte.." ); 
      THISO -> set( "weight", 7 );
      drinks = 1;
      return 1;
      }
    write( "Wow!  Uh, there's an error in this rad latte!" );
    return 1;
    }
  return 0;
  }

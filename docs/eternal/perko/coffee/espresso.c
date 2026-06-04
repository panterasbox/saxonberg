inherit ObjectCode;
 
#include "path.h"
 
int drinks;
 
void extra_create()
  {
  set( "id", ({
    "full espresso",
    "espresso",
    "pete's espresso",
    "pete's coffee",
    "coffee",
    "mug",
    "mug of espresso",
    "mug of coffee",
    }) );
  set( "short", "a full, steaming mug of Pete's espresso" );
  set( "long",
    "This little espresso mug/cup thing seems to be filled to the brim "
    "with tasty-looking espresso.  You feel more wide awake just from "
    "looking at it.  Maybe for a heightened effect you should <drink> the "
    "espresso.." );
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
      say( strformat( "After finishing off Pete's espresso, a look of "
        "utter contentment washes over " + PNAME + "'s face." ) );
      write("You finish off your mug of espresso.\n"
        "You tell yourself: All is right with the world.\n"
        "You smile contentedly.\n" );
      THISP -> add_fatigue( 8 );
      move_object( clone_object( COFFEE "espmug" ), THISP );
      destruct( THISO );
      return 1;
      }
    if( drinks == 2 )
      {
      say( strformat( "After taking a sip of Pete's espresso, a beautific "
        "smile crosses " + PNAME + "'s face." ) );
      write("You take a sip of Pete's espresso.\n"
        "You tell yourself: Wow!  This is incredibly good espresso!\n"
        "You smile contentedly.\n" );
      THISP -> add_fatigue( 8 );
      THISO -> set( "id", ({
        "half espresso",
        "espresso",
        "pete's espresso",
        "pete's coffee",
        "coffee",
        "mug",
        "mug of espresso",
        "mug of coffee",
        }) );
      THISO -> set( "short", "a half-full, steaming mug of Pete's espresso" );
      THISO -> set( "long", "  The espresso in this little espresso "
        "mug/cup thing seems to have been consumed to the halfway point.  "
        "That doesn't mean that it isn't still tasty though..  Maybe you "
        "should <drink> the espresso.." ); 
      THISO -> set( "weight", 7 );
      drinks = 1;
      return 1;
      }
    write( "Wow!  Uh, there's an error in the espresso." );
    return 1;
    }
  return 0;
  }

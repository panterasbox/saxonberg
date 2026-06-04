inherit ObjectCode;

#include "path.h"
 
int drinks;
 
void extra_create()
  {
  set( "id", ({
    "coffee",
    "pete's coffee",       
    "mug",
    "mug of coffee",
    "mug of pete's coffee",
    }) );
  set( "short", "a full, steaming mug of Pete's coffee" );
  set( "long",
    "  \"Perk up with the Posh Perko Pit\" is emblazoned upon the side of "
    "this ceramic coffee mug.  That's pure excitement in itself, of course, "
    "but what is even better is the fact that this mug is filled to the "
    "tippy-top with Perko Pete's special coffee.  A thought floats to your "
    "conscious level and says to you, \"maybe you should <drink> it..\"" );
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
      move_object( clone_object( COFFEE "coffmug" ), THISP );
      say( "With a quick gulp, the last of Pete's coffee disappears down\n"
        + PNAME + "'s throat.\n" );
      write( "You tilt your head back and down the last of the coffee.\n" );
      THISP -> add_fatigue( 8 );
      THISO -> set( "short", "an empty Posh Perko Pit coffee mug" );
      THISO -> set( "long", "  This appears to be a rather nifty-looking "
        "coffee mug.  You sense that the magic of merchandising is in "
        "effect by the phrase \"Perk up with the Posh Perko Pit\" written "
        "in flaming green letters on the side." );
      THISO -> set( "weight", 5 );
      drinks = 0;
      return 1;
      }
    if( drinks == 2 )
      {
      say( PNAME + " takes a few sips of Pete's coffee and sighs "
        "contentedly.\n" );
      write( "You take a few sips of Pete's coffee and sigh "
        "contentedly.\n" );
      THISP -> add_fatigue( 8 );
      THISO -> set( "short", "a half-full, steaming mug of Pete's coffee" );
      THISO -> set( "long", "  'Half-full' is the official phrase for "
        "describing what this mug is now.  That half remaining, however, "
        "is some of Perko Pete's best coffee..  Another phrase that comes "
        "to mind right now is '<drink coffee>'");
      THISO -> set( "weight", 7 );
      drinks = 1;
      return 1;
      }
    write( "Wow!  Uh, there's an error in the coffee." );
    return 1;
    }
  return 0;
  }

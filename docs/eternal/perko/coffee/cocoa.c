inherit ObjectCode;
 
int drinks;
 
void extra_create()
  {
  set( "id", ({
    "hot chocolate",
    "pete's chocolate",
    "pete's hot chocolate",
    "pete's cocoa",
    "chocolate",
    "hot cocoa",
    "cocoa",
    "mug",
    "mug of hot chocolate",
    "mug of chocolate",
    "mug of cocoa",
    }) );
  set( "short", "a full, steaming mug of Pete's hot chocolate" );
  set( "long",
    "  The incredible aroma of chocolate fills the room as the result of "
    "this mug of hot chocolate.  Pete takes a couple of bars o' milk "
    "chocolate and melts them together with evaporated milk and plenty of "
    "vanilla to make this delicious concoction.  It's probably even better "
    "when you drink it." );
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
      + PNAME + ".\n" + PNAME + " turns a bright red.\n" ) );
    return 1;
    }
  if ( id( str ) ) 
    {
    if( drinks == 0 )
      return 0;
    if( drinks == 1 )
      {
      say( strformat( "After finishing off Pete's hot chocolate, a "
        "look of utter contentment washes over " + PNAME + "'s face." ) );
      write( "You finish off your mug of hot chocolate.\n"
        "You tell yourself: God..  I'm going to regret this tommorrow..\n"
        "You grin weakly.\n" );
      THISP -> add_fatigue( 4 );
      THISO -> set( "short", "an empty Posh Perko Pit hot chocolate mug" );
      THISO -> set( "long", "  Alas..  The cup that once gave you so much "
        "joy in the form of decadant, gluttonous pleasure is now only "
        "a source of bitter memory.  You run your finger around the "
        "inside of the mug hoping for some small, residual drops of "
        "Pete's fantastic cocoa, but realize that you just did that a "
        "few minutes ago.\n  You strike out in misery." );
      THISO -> set( "weight", 5 );
      drinks = 0;
      return 1;
      }
    if( drinks == 2 )
      {
      write( "You take a sip of Pete's hot chocolate.\n"
        "You tell yourself: Holy cow!  This _is_ chocolate!\n"
        "You smile contentedly.\n" );
      say( "After taking a sip of Pete's hot chocolate, a beautific "
        "smile crosses " + PNAME + "'s face.\n" );
      THISP -> add_fatigue( 4 );
      THISO -> set( "short", "a half-full, steaming mug of Pete's hot "
        "chocolate" );
      THISO -> set( "long", "  The incredible aroma of chocolate fills "
        "the room as the result of this mug of hot chocolate.  "
        "Unfortunately, it seems to be filled only half way.  That "
        "doesn't mean that it isn't still scrumdiddlyumptious though..  "
        "Maybe you should drink the rest of the hot chocolate..");
      THISO -> set( "weight", 7 );
      drinks = 1;
      return 1;
      }
    write( "Wow!  Uh, there's an error in the hot chocolate." );
    return 1;
    }
  return 0;
  }

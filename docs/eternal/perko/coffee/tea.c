inherit ObjectCode;
 
int drinks;
 
void extra_create()
  {
  set( "id", ({
    "tea",
    "pete's tea",
    "cup of tea",
    "mug of tea",
    "cup",
    "tea cup",
    "teacup",
    "mug",
    }) );
  set( "short", "a nice, full cup of Pete's tea" );
  set( "long",
    "This small, ceramic teacup seems to be the repository for a "
    "full teacup's worth of Perko Pete's tea.  His special blend "
    "of 72 herbs 'n spices fills the room with its quaint aroma." );
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
      write( "You drain the last of Perko Pete's tea.\n"
        "You say: God bless the Queen!\n" );
      say( PNAME + " drains the rest of Perko Pete's tea.\n"
        + PNAME + " says: God bless the Queen!\n" );
      THISP -> add_fatigue( 8 );
      THISO -> set( "short", "an empty Posh Perko Pit tea cup" );
      THISO -> set( "long", "  Yep, this small, ceramic tea cup is "
        "one that epitimizes the word \"empty.\"  You think back "
        "in fond memory of the days when this was a cup filled "
        "with Pete's special-brew tea.." );
      THISO -> set( "weight", 5 );
      drinks = 0;
      return 1;
      }
    if( drinks == 2 )
      {
      write( "You take a few sips from your cup o' tea.\n"
        "You develop a sudden craving for a crumpet.\n" );
      say( PNAME + " takes a few sips from a teacup.\n"
        + PNAME + " begins to search madly for a crumpet.\n" );
      THISP -> add_fatigue( 8 );
      THISO -> set( "short", "a half-full, yet still nice, cup o' tea" );
      THISO -> set( "long", "  Hmm..  It seems as though somebody has "
        "drunk half of this small cup of Pete's special tea.  The tea "
        "seems to be saying to you: <drink> me!  Now!" );
      THISO -> set( "weight", 7 );
      drinks = 1;
      return 1;
      }
    write( "Wow!  Uh, there's an error in the tea." );
    return 1;
    }
  return 0;
  }

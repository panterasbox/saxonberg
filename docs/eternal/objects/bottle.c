#include "/zone/null/eternal/eternal.h"
inherit ThingCode;
 
void extra_create()
  {
  set( "id", ({
    "antibiotics",
    "antibiotic",
    "bottle",
    "a small bottle",
    "small bottle",
    "bottle of antibiotics",
    "jar",
    "biotic"
    }) );
  set( "short", "a small bottle" );
  set( "long", "This is a small, red bottle, with a "
    "twist-off lid.  Prominantly labelled on the side "
    "is the phrase \"Tfds wR Poinmwfxvn.\"  Hmm.  "
    "You wish you'd taken that class in Ancient Entesian "
    "back at the Crimson City Community College." );
  set( "weight", 5 );
  set( "value", 300 );
  set( "wuzzleft", 1 );
  set( NoStoreP, 1 );
  }
 
void extra_init()
  {
  add_action( "remove_cap", "twist off" );
  add_action( "remove_cap", "unscrew" );
  add_action( "remove_cap", "remove" );
  add_action( "remove_cap", "open" );
  }
 
remove_cap( string str )
  {
  if( !str )
    {
    write( query_verb() + " what?\n" );
    return 1;
    }
  if( id(str) || str == "cap" || str == "lid" )
    {
    if( query("wuzzleft") == 0 )
      {
      write( "The small bottle appears to be empty.\n" );
      return 1;
      }
    if( THISP->query_stat("dex") <= 10 )
      {
      write( strformat( "You pop open the bottle.  "
        "Inside you find a wad of cotton and a small "
        "pill.\n" ) );
      say( strformat( PNAME + " pops open a bottle "
        "in " + possessive(THISP) + " possession and "
        "removes from it a wad of cotton and a small " 
        "pill.\n" ) );
      set( "wuzzleft", 0 );
      move_object( clone_object( "cotton" ), THISP );
      move_object( clone_object( "pill" ), THISP );
      return 1;
      }
    write( strformat( "Using every trick at your disposal, "
      "you still find yourself unable to open the small "
      "bottle.\n" ) );
    say( strformat( PNAME + " messes around with a small "
      "bottle " + subjective(THISP) + " is holding, but "
      "seems unable to open it.\n" ) );
    return 1;
    }
  return 0;
  }

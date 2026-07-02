//  frog.c

inherit ThingCode;


void extra_create()
{
    set( "id", ({ "little frog", "frog" }) );
    set( "short", "a little frog" );
    set( "long",
      "This is a little frog.  Its greenish-black skin appears very " +
      "slippery.  This particular species of frog has been used since " +
      "ancient times as an ingredient in certain healing potions." );
    set( "value", 0 );
    set( "weight", 20 );
    set( NoStoreP, 1 );
}

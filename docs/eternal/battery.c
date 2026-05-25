inherit ObjectCode;

void extra_create()
{
   set( "id", "battery" );
   set( "short", "The Energizer.\n" );
   set( "long", "This is an long-lasting energizer battery.\n" );
   set( "gettable", 0 );
   set( NoStealP, 1 );
}

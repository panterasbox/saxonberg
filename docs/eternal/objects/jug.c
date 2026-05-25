#include "/zone/null/eternal/eternal.h"
inherit ObjectCode;
 
void extra_create() {
  set( "id", ({
    "jug",
    "jug of moonshine",
    "empty jug",
    "empty jug of moonshine",
    "an empty jug of ma's moonshine",
    "an empty jug of Ma's moonshine",
    "earthenware jug",
    "moonshine" }) );
  set( "short", "an empty jug of Ma's moonshine" );
  set( "long",
    "Three X's labelled carefully on the side of this "
    "empty and useless earthenware jug immediately "
    "reveal it for what it is.  That and the short "
    "description." );
  set( "value", 0 );
  set( "weight", 100 );
  }
